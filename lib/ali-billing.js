/**
 * ALI paid annual billing (2026-11-17).
 *
 * The plan: one price per leader per year, the leader's whole team included.
 * Founding price $149, read from the site setting ali_price_cents and locked
 * onto the company's billing row the first time it starts billing, so a later
 * price rise never touches founding customers.
 *
 * The pilot: the first 20 companies to start billing get their first year
 * free. The spot is claimed once (database function ali_billing_claim_pilot,
 * see database/ALI_BILLING.sql) and kept forever. Their Stripe subscription
 * starts with a free trial that ends on the pilot year's last day, with no
 * card needed to start; Stripe asks for a card before it ends.
 *
 * Stripe is called over its web API through lib/shop/stripe.js, the same
 * connection the shop uses. Stripe's notifications arrive at
 * api/shop/webhook.js, which hands ALI ones to handleAliStripeEvent().
 *
 * Site settings (ao_bit_settings, all optional):
 *   ali_price_cents          number or { cents }    default 14900
 *   ali_pilot_slots          number or { slots }    default 20
 *   ali_stripe_product_id    string or { id }       a lasting Stripe product, optional
 *   ali_billing_enforced     true or { enabled }    when on, companies that never
 *                                                   started billing cannot start rounds
 */
import { supabaseAdmin } from './supabase-admin.js';
import { stripeRequest, stripeReady } from './shop/stripe.js';
import { getSetting } from './shop/shop.js';

export const DEFAULT_PRICE_CENTS = 14900;
export const DEFAULT_PILOT_SLOTS = 20;
export const PILOT_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
export const BILLING_STATUSES = ['none', 'pilot', 'trialing', 'active', 'past_due', 'canceled'];
export const ALI_STRIPE_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];
const BILLING_FIELDS =
  'company_id, stripe_customer_id, stripe_subscription_id, billing_status, pilot_granted_at, pilot_number, paid_through, cancel_at_period_end, leader_seats, price_cents_locked';

// ---------------------------------------------------------------- pure helpers

/** Pure: a setting stored as a bare value or as { [field]: value }. */
function settingValue(raw, field) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw[field];
  return raw;
}

/** Pure: the price per leader per year in cents, from the setting, $149 when unset or bad. */
export function priceCentsFromSetting(raw) {
  const n = Number(settingValue(raw, 'cents'));
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_PRICE_CENTS;
}

/** Pure: how many pilot years there are in all. */
export function pilotSlotsFromSetting(raw) {
  const v = settingValue(raw, 'slots');
  if (v === null || v === undefined || v === '') return DEFAULT_PILOT_SLOTS;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_PILOT_SLOTS;
}

/** Pure: whether the billing cutover setting is switched on. */
export function enforcedFromSetting(raw) {
  return settingValue(raw, 'enabled') === true;
}

/** Pure: a lasting Stripe product id from the setting, or null. */
export function productIdFromSetting(raw) {
  const v = settingValue(raw, 'id');
  return typeof v === 'string' && /^prod_/.test(v) ? v : null;
}

/** Pure: the price a company pays: its locked price, else today's price. */
export function companyPriceCents(billing, settingPriceCents = DEFAULT_PRICE_CENTS) {
  const locked = Number(billing?.price_cents_locked);
  return Number.isInteger(locked) && locked > 0 ? locked : settingPriceCents;
}

/** Pure: "$149" from 14900, "$149.50" from 14950. */
export function formatPrice(cents) {
  const n = Number(cents) || 0;
  return n % 100 === 0 ? `$${n / 100}` : `$${(n / 100).toFixed(2)}`;
}

/**
 * Pure: whether a company can get a pilot year. It can when it already has
 * one, or when it never started a paid plan and spots are left.
 */
export function pilotEligible({ grantedCount = 0, slots = DEFAULT_PILOT_SLOTS, billing = null } = {}) {
  if (billing?.pilot_granted_at) return true;
  if (billing?.stripe_subscription_id) return false;
  return Number(grantedCount) < Number(slots);
}

/** Pure: when the free pilot year ends, or null. */
export function pilotEndsAt(billing) {
  if (!billing?.pilot_granted_at) return null;
  const t = new Date(billing.pilot_granted_at).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + PILOT_DAYS * DAY_MS);
}

/**
 * Pure: the Stripe trial end (unix seconds) for a pilot company, so the trial
 * ends with the pilot year. Null when there is no pilot or under two days are
 * left (Stripe needs a trial at least 48 hours out).
 */
export function pilotTrialEnd(billing, now = new Date()) {
  const end = pilotEndsAt(billing);
  if (!end) return null;
  if (end.getTime() - now.getTime() < 2 * DAY_MS) return null;
  return Math.floor(end.getTime() / 1000);
}

/**
 * Pure: whether a company may start a new survey round. Results stay viewable
 * whatever this says; this gates only new rounds.
 *   - Stripe not connected: always yes, so nothing breaks before billing is on.
 *   - Never started billing (no row, or status none): yes until the cutover
 *     setting ali_billing_enforced is on. This keeps the test companies usable.
 *   - pilot: yes while the free year lasts.
 *   - trialing, active: yes.
 *   - past_due, canceled: no.
 */
export function mayStartRound({ billing = null, stripeOn = false, enforced = false, now = new Date() } = {}) {
  if (!stripeOn) return { allowed: true, reason: 'billing_off' };
  const status = billing?.billing_status || null;
  if (!status || status === 'none') {
    return enforced ? { allowed: false, reason: 'no_plan' } : { allowed: true, reason: 'not_enforced' };
  }
  if (status === 'pilot') {
    const end = pilotEndsAt(billing);
    if (end && end.getTime() > now.getTime()) return { allowed: true, reason: 'pilot' };
    return { allowed: false, reason: 'pilot_ended' };
  }
  if (status === 'trialing' || status === 'active') return { allowed: true, reason: status };
  return { allowed: false, reason: status };
}

/** Pure: the plain message shown when a round is blocked. */
export function blockedMessage(reason) {
  if (reason === 'past_due') return 'Your last ALI payment did not go through. Update your card on the Billing page to start a new survey round. Your results are still here.';
  if (reason === 'pilot_ended') return 'Your free pilot year has ended. Subscribe on the Billing page to start a new survey round. Your results are still here.';
  if (reason === 'canceled') return 'Your ALI plan has ended. Subscribe again on the Billing page to start a new survey round. Your results are still here.';
  return 'Starting a survey round needs an ALI plan. Go to the Billing page to start one. Your results are still here.';
}

/** Pure: the Checkout Session request for an ALI yearly subscription. */
export function aliCheckoutParams({ companyId, seats = 1, priceCents = DEFAULT_PRICE_CENTS, productId = null, origin, customerId = null, email = null, trialEnd = null }) {
  const quantity = Math.max(1, Math.floor(Number(seats) || 1));
  const params = {
    mode: 'subscription',
    line_items: [
      {
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          recurring: { interval: 'year' },
          ...(productId ? { product: productId } : { product_data: { name: 'Archetype Leadership Index, per leader per year (whole team included)' } }),
        },
      },
    ],
    success_url: `${origin}/ali/billing?checkout=done`,
    cancel_url: `${origin}/ali/billing?checkout=canceled`,
    client_reference_id: companyId,
    metadata: { ali_company_id: companyId },
    subscription_data: {
      metadata: { ali_company_id: companyId },
      ...(trialEnd
        ? { trial_end: trialEnd, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } }
        : {}),
    },
  };
  // A free pilot year starts with no card; Stripe asks for one before it ends.
  if (trialEnd) params.payment_method_collection = 'if_required';
  if (customerId) params.customer = customerId;
  else if (email) params.customer_email = email;
  return params;
}

/** Pure: Stripe subscription status -> ALI billing status. */
export function mapSubscriptionStatus(s) {
  switch (s) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

function idOf(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.id || null;
}

/** Pure: a Stripe subscription -> the billing row fields it sets. */
export function subscriptionToBilling(sub) {
  if (!sub?.id) return null;
  const item = sub.items?.data?.[0] || null;
  // Newer Stripe versions keep the period end on the item.
  const periodEnd = sub.current_period_end || item?.current_period_end || null;
  const status = mapSubscriptionStatus(sub.status);
  const through = status === 'trialing' && sub.trial_end ? sub.trial_end : periodEnd;
  const patch = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: idOf(sub.customer),
    billing_status: status,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    paid_through: through ? new Date(through * 1000).toISOString() : null,
  };
  const q = Number(item?.quantity);
  if (Number.isInteger(q) && q >= 1) patch.leader_seats = q;
  return patch;
}

/**
 * Pure: which handler a Stripe event belongs to.
 *   'ali'  an ALI checkout, or a subscription / invoice event (the shop sells
 *          one-off payments only, so these are ALI's)
 *   'shop' a shop checkout
 *   null   nothing to do
 */
export function routeStripeEvent(event) {
  const type = event?.type;
  const obj = event?.data?.object;
  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    if (obj?.metadata?.ali_company_id || obj?.mode === 'subscription') return 'ali';
    return 'shop';
  }
  if (ALI_STRIPE_EVENTS.includes(type)) return 'ali';
  return null;
}

/** Pure: the company, subscription and customer an ALI event points at. */
export function aliEventRefs(event) {
  const obj = event?.data?.object || {};
  const type = event?.type || '';
  if (type.startsWith('checkout.session.')) {
    return {
      companyId: obj.metadata?.ali_company_id || obj.client_reference_id || null,
      subscriptionId: idOf(obj.subscription),
      customerId: idOf(obj.customer),
    };
  }
  if (type.startsWith('customer.subscription.')) {
    return { companyId: obj.metadata?.ali_company_id || null, subscriptionId: obj.id || null, customerId: idOf(obj.customer) };
  }
  if (type.startsWith('invoice.')) {
    const details = obj.parent?.subscription_details || obj.subscription_details || null;
    const lineMeta = obj.lines?.data?.[0]?.metadata || null;
    return {
      companyId: details?.metadata?.ali_company_id || lineMeta?.ali_company_id || null,
      subscriptionId: idOf(details?.subscription) || idOf(obj.subscription) || null,
      customerId: idOf(obj.customer),
    };
  }
  return { companyId: null, subscriptionId: null, customerId: null };
}

// ---------------------------------------------------------------- database + Stripe

/** The plain billing settings, read once per call. */
export async function billingSettings() {
  const [price, slots, enforced, product] = await Promise.all([
    getSetting('ali_price_cents').catch(() => null),
    getSetting('ali_pilot_slots').catch(() => null),
    getSetting('ali_billing_enforced').catch(() => null),
    getSetting('ali_stripe_product_id').catch(() => null),
  ]);
  return {
    priceCents: priceCentsFromSetting(price),
    pilotSlots: pilotSlotsFromSetting(slots),
    enforced: enforcedFromSetting(enforced),
    productId: productIdFromSetting(product),
  };
}

/** The company's billing row, or null (also null when the table is not there yet). */
export async function getCompanyBilling(companyId) {
  if (!companyId) return null;
  const { data, error } = await supabaseAdmin.from('ali_billing').select(BILLING_FIELDS).eq('company_id', companyId).maybeSingle();
  if (error) return null;
  return data || null;
}

export async function countPilotsGranted() {
  const { count, error } = await supabaseAdmin.from('ali_billing').select('company_id', { count: 'exact', head: true }).not('pilot_granted_at', 'is', null);
  if (error) return null;
  return count || 0;
}

/** Whether a company may start a new round right now. Never throws. */
export async function checkRoundAllowed(companyId, now = new Date()) {
  const stripeOn = stripeReady();
  if (!stripeOn) return mayStartRound({ stripeOn });
  const [billing, settings] = await Promise.all([getCompanyBilling(companyId).catch(() => null), billingSettings().catch(() => ({ enforced: false }))]);
  return mayStartRound({ billing, stripeOn, enforced: settings.enforced, now });
}

/** Pure: the plain billing state the Billing page shows. */
export function billingView({ billing = null, settings, stripeOn, grantedCount = null, isOwner = false, now = new Date() }) {
  const status = billing?.billing_status || 'none';
  const priceCents = companyPriceCents(billing, settings.priceCents);
  const pilot = Boolean(billing?.pilot_granted_at);
  const pilotEnds = pilotEndsAt(billing);
  const spotsLeft = grantedCount == null ? null : Math.max(0, settings.pilotSlots - grantedCount);
  const subscribed = ['trialing', 'active', 'past_due'].includes(status) && Boolean(billing?.stripe_subscription_id);
  const pilotOffer = !subscribed && (pilot ? Boolean(pilotEnds && pilotEnds > now) : pilotEligible({ grantedCount: grantedCount ?? Infinity, slots: settings.pilotSlots, billing }));
  return {
    ok: true,
    billingOn: stripeOn,
    status,
    pilot,
    pilotNumber: billing?.pilot_number || null,
    pilotEndsOn: pilotEnds ? pilotEnds.toISOString() : null,
    pilotSpotsLeft: spotsLeft,
    paidThrough: billing?.paid_through || null,
    cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
    seats: billing?.leader_seats || 1,
    priceCents,
    priceLabel: formatPrice(priceCents),
    founding: priceCents <= DEFAULT_PRICE_CENTS,
    isOwner,
    canStart: stripeOn && isOwner && !subscribed,
    startsPilot: pilotOffer,
    canManage: stripeOn && isOwner && Boolean(billing?.stripe_customer_id),
    roundsAllowed: mayStartRound({ billing, stripeOn, enforced: settings.enforced, now }).allowed,
  };
}

/** Starts a Stripe Checkout for the company. Returns { url } or { error }. */
export async function startCheckout({ companyId, email, origin, now = new Date() }) {
  if (!stripeReady()) return { error: 'Billing is not switched on yet.' };
  const settings = await billingSettings();
  let billing = await getCompanyBilling(companyId);
  if (billing && ['trialing', 'active', 'past_due'].includes(billing.billing_status) && billing.stripe_subscription_id) {
    return { error: 'Your company already has an ALI plan. Use Manage billing to change it.' };
  }
  // Claim a pilot year when one is still free (kept forever once granted).
  if (!billing?.pilot_granted_at && !billing?.stripe_subscription_id) {
    const { error } = await supabaseAdmin.rpc('ali_billing_claim_pilot', {
      p_company_id: companyId,
      p_slots: settings.pilotSlots,
      p_price_cents: settings.priceCents,
    });
    if (error) {
      console.error('[ali-billing] pilot claim failed:', error.message);
      return { error: 'Billing is not ready yet. Please try again later.' };
    }
    billing = await getCompanyBilling(companyId);
  }
  if (!billing) return { error: 'Billing is not ready yet. Please try again later.' };
  const priceCents = companyPriceCents(billing, settings.priceCents);
  if (!billing.price_cents_locked) {
    await supabaseAdmin.from('ali_billing').update({ price_cents_locked: priceCents, updated_at: now.toISOString() }).eq('company_id', companyId);
  }
  const params = aliCheckoutParams({
    companyId,
    seats: billing.leader_seats || 1,
    priceCents,
    productId: settings.productId,
    origin,
    customerId: billing.stripe_customer_id || null,
    email,
    trialEnd: pilotTrialEnd(billing, now),
  });
  const session = await stripeRequest('/checkout/sessions', params);
  return { url: session.url };
}

/** Opens the Stripe billing portal (update card, cancel). Returns { url } or { error }. */
export async function startPortal({ companyId, origin }) {
  if (!stripeReady()) return { error: 'Billing is not switched on yet.' };
  const billing = await getCompanyBilling(companyId);
  if (!billing?.stripe_customer_id) return { error: 'There is no plan to manage yet. Start one first.' };
  const session = await stripeRequest('/billing_portal/sessions', { customer: billing.stripe_customer_id, return_url: `${origin}/ali/billing` });
  return { url: session.url };
}

async function findBillingRow({ companyId, subscriptionId, customerId }) {
  if (companyId) {
    const row = await getCompanyBilling(companyId);
    if (row) return row;
    // A company that pays without a row yet (should not happen): make one.
    const { data: company } = await supabaseAdmin.from('ali_companies').select('id').eq('id', companyId).maybeSingle();
    if (!company) return null;
    await supabaseAdmin.from('ali_billing').upsert({ company_id: companyId }, { onConflict: 'company_id', ignoreDuplicates: true });
    return getCompanyBilling(companyId);
  }
  if (subscriptionId) {
    const { data } = await supabaseAdmin.from('ali_billing').select(BILLING_FIELDS).eq('stripe_subscription_id', subscriptionId).maybeSingle();
    if (data) return data;
  }
  if (customerId) {
    const { data } = await supabaseAdmin.from('ali_billing').select(BILLING_FIELDS).eq('stripe_customer_id', customerId).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

/**
 * The webhook side: an ALI Stripe event updates the company's billing row.
 * Safe to run any number of times and in any order: it always reads the
 * subscription's current state from Stripe and writes that.
 * Returns { ok, ... }; ok false makes the webhook answer 500 so Stripe retries.
 */
export async function handleAliStripeEvent(event, { fetchSubscription = null } = {}) {
  const refs = aliEventRefs(event);
  const row = await findBillingRow(refs);
  if (!row) return { ok: true, skipped: 'no matching ALI company' };
  const subscriptionId = refs.subscriptionId || row.stripe_subscription_id || null;
  const patch = {};
  if (refs.customerId && !row.stripe_customer_id) patch.stripe_customer_id = refs.customerId;
  if (subscriptionId) {
    // A different, older subscription's events never overwrite the current one.
    if (
      row.stripe_subscription_id &&
      row.stripe_subscription_id !== subscriptionId &&
      event.type !== 'checkout.session.completed' &&
      !['none', 'canceled'].includes(row.billing_status)
    ) {
      return { ok: true, skipped: 'older subscription' };
    }
    const fetcher = fetchSubscription || ((id) => stripeRequest(`/subscriptions/${encodeURIComponent(id)}`, null, 'GET'));
    let sub = null;
    try {
      sub = await fetcher(subscriptionId);
    } catch (err) {
      // Fall back to the copy inside the event when Stripe cannot be reached.
      if (event.type?.startsWith('customer.subscription.')) sub = event.data?.object;
      else return { ok: false, error: err?.message || 'Could not read the subscription from Stripe.' };
    }
    Object.assign(patch, subscriptionToBilling(sub) || {});
  }
  if (!Object.keys(patch).length) return { ok: true, unchanged: true };
  patch.last_synced_at = new Date().toISOString();
  patch.updated_at = patch.last_synced_at;
  const { error } = await supabaseAdmin.from('ali_billing').update(patch).eq('company_id', row.company_id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, company_id: row.company_id, status: patch.billing_status || row.billing_status };
}
