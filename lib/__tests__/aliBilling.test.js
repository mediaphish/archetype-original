/**
 * @jest-environment node
 *
 * ALI paid annual billing (2026-11-17): price from a setting, the first 20
 * companies get a free pilot year, the round gate, and Stripe notifications.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { formEncode } from '../shop/stripe.js';
import { WEBHOOK_EVENTS } from '../shop/connectWebhook.js';
import {
  ALI_STRIPE_EVENTS,
  DEFAULT_PRICE_CENTS,
  aliCheckoutParams,
  aliEventRefs,
  billingView,
  blockedMessage,
  companyPriceCents,
  enforcedFromSetting,
  formatPrice,
  mapSubscriptionStatus,
  mayStartRound,
  pilotEligible,
  pilotSlotsFromSetting,
  pilotTrialEnd,
  priceCentsFromSetting,
  productIdFromSetting,
  routeStripeEvent,
  subscriptionToBilling,
} from '../ali-billing.js';

const NOW = new Date('2026-11-17T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('price', () => {
  it('is $149 when the setting is missing or bad', () => {
    expect(DEFAULT_PRICE_CENTS).toBe(14900);
    expect(priceCentsFromSetting(null)).toBe(14900);
    expect(priceCentsFromSetting('abc')).toBe(14900);
    expect(priceCentsFromSetting(-5)).toBe(14900);
    expect(priceCentsFromSetting(19.5)).toBe(14900);
  });
  it('reads the setting as a number or { cents }', () => {
    expect(priceCentsFromSetting(19900)).toBe(19900);
    expect(priceCentsFromSetting({ cents: 19900 })).toBe(19900);
  });
  it('a founding company keeps its locked price when the price goes up', () => {
    expect(companyPriceCents({ price_cents_locked: 14900 }, 19900)).toBe(14900);
    expect(companyPriceCents(null, 19900)).toBe(19900);
    expect(companyPriceCents({ price_cents_locked: null }, 19900)).toBe(19900);
  });
  it('formats plainly', () => {
    expect(formatPrice(14900)).toBe('$149');
    expect(formatPrice(14950)).toBe('$149.50');
  });
  it('reads the other settings', () => {
    expect(pilotSlotsFromSetting(null)).toBe(20);
    expect(pilotSlotsFromSetting({ slots: 5 })).toBe(5);
    expect(enforcedFromSetting(true)).toBe(true);
    expect(enforcedFromSetting({ enabled: true })).toBe(true);
    expect(enforcedFromSetting('true')).toBe(false);
    expect(enforcedFromSetting(null)).toBe(false);
    expect(productIdFromSetting('prod_123')).toBe('prod_123');
    expect(productIdFromSetting({ id: 'prod_9' })).toBe('prod_9');
    expect(productIdFromSetting('price_1')).toBe(null);
  });
});

describe('pilot eligibility', () => {
  it('the first 20 get a pilot year, the 21st does not', () => {
    expect(pilotEligible({ grantedCount: 0, slots: 20 })).toBe(true);
    expect(pilotEligible({ grantedCount: 19, slots: 20 })).toBe(true);
    expect(pilotEligible({ grantedCount: 20, slots: 20 })).toBe(false);
  });
  it('a company that already has one keeps it even when spots are gone', () => {
    expect(pilotEligible({ grantedCount: 20, slots: 20, billing: { pilot_granted_at: '2026-11-01T00:00:00Z' } })).toBe(true);
  });
  it('a company that already started a paid plan cannot get one later', () => {
    expect(pilotEligible({ grantedCount: 0, slots: 20, billing: { stripe_subscription_id: 'sub_1' } })).toBe(false);
  });
  it('the trial ends with the pilot year, and not when under two days are left', () => {
    const granted = new Date(NOW.getTime() - 10 * DAY).toISOString();
    const end = pilotTrialEnd({ pilot_granted_at: granted }, NOW);
    expect(end).toBe(Math.floor((new Date(granted).getTime() + 365 * DAY) / 1000));
    const late = new Date(NOW.getTime() - 364 * DAY).toISOString();
    expect(pilotTrialEnd({ pilot_granted_at: late }, NOW)).toBe(null);
    expect(pilotTrialEnd(null, NOW)).toBe(null);
  });
});

describe('round gate', () => {
  it('everything is allowed while Stripe is not connected', () => {
    expect(mayStartRound({ stripeOn: false, billing: { billing_status: 'canceled' } }).allowed).toBe(true);
  });
  it('companies that never started billing stay usable until the cutover', () => {
    expect(mayStartRound({ stripeOn: true, billing: null, enforced: false }).allowed).toBe(true);
    expect(mayStartRound({ stripeOn: true, billing: { billing_status: 'none' }, enforced: false }).allowed).toBe(true);
    expect(mayStartRound({ stripeOn: true, billing: null, enforced: true })).toEqual({ allowed: false, reason: 'no_plan' });
  });
  it('pilot, trialing and active may start rounds', () => {
    const pilot = { billing_status: 'pilot', pilot_granted_at: new Date(NOW.getTime() - 30 * DAY).toISOString() };
    expect(mayStartRound({ stripeOn: true, billing: pilot, enforced: true, now: NOW }).allowed).toBe(true);
    expect(mayStartRound({ stripeOn: true, billing: { billing_status: 'trialing' }, enforced: true }).allowed).toBe(true);
    expect(mayStartRound({ stripeOn: true, billing: { billing_status: 'active' }, enforced: true }).allowed).toBe(true);
  });
  it('a pilot year that has run out, past due and canceled are blocked', () => {
    const old = { billing_status: 'pilot', pilot_granted_at: new Date(NOW.getTime() - 400 * DAY).toISOString() };
    expect(mayStartRound({ stripeOn: true, billing: old, now: NOW })).toEqual({ allowed: false, reason: 'pilot_ended' });
    expect(mayStartRound({ stripeOn: true, billing: { billing_status: 'past_due' } }).allowed).toBe(false);
    expect(mayStartRound({ stripeOn: true, billing: { billing_status: 'canceled' } }).allowed).toBe(false);
  });
  it('a blocked round points to the Billing page and says results stay', () => {
    for (const r of ['no_plan', 'pilot_ended', 'past_due', 'canceled']) {
      expect(blockedMessage(r)).toMatch(/Billing page/);
      expect(blockedMessage(r)).toMatch(/results are still here/);
    }
  });
});

describe('subscription checkout', () => {
  it('is a yearly subscription per leader, tagged with the company', () => {
    const p = aliCheckoutParams({ companyId: 'co-1', seats: 3, priceCents: 14900, origin: 'https://x', email: 'a@b.co' });
    expect(p.mode).toBe('subscription');
    expect(p.line_items[0].quantity).toBe(3);
    expect(p.line_items[0].price_data.recurring).toEqual({ interval: 'year' });
    expect(p.metadata.ali_company_id).toBe('co-1');
    expect(p.subscription_data.metadata.ali_company_id).toBe('co-1');
    expect(p.success_url).toBe('https://x/ali/billing?checkout=done');
    expect(p.cancel_url).toBe('https://x/ali/billing?checkout=canceled');
    expect(p.customer_email).toBe('a@b.co');
    expect(p.payment_method_collection).toBeUndefined();
    expect(p.subscription_data.trial_end).toBeUndefined();
  });
  it('a pilot company starts a free year with no card needed', () => {
    const p = aliCheckoutParams({ companyId: 'co-1', origin: 'https://x', trialEnd: 1800000000, customerId: 'cus_1', email: 'a@b.co' });
    expect(p.payment_method_collection).toBe('if_required');
    expect(p.subscription_data.trial_end).toBe(1800000000);
    expect(p.subscription_data.trial_settings.end_behavior.missing_payment_method).toBe('cancel');
    expect(p.customer).toBe('cus_1');
    expect(p.customer_email).toBeUndefined();
  });
  it('encodes the way Stripe reads it', () => {
    const s = decodeURIComponent(
      formEncode(aliCheckoutParams({ companyId: 'co-1', seats: 2, priceCents: 14900, productId: 'prod_A', origin: 'https://x', trialEnd: 1800000000 }))
    );
    expect(s).toContain('mode=subscription');
    expect(s).toContain('line_items[0][quantity]=2');
    expect(s).toContain('line_items[0][price_data][unit_amount]=14900');
    expect(s).toContain('line_items[0][price_data][currency]=usd');
    expect(s).toContain('line_items[0][price_data][recurring][interval]=year');
    expect(s).toContain('line_items[0][price_data][product]=prod_A');
    expect(s).toContain('metadata[ali_company_id]=co-1');
    expect(s).toContain('subscription_data[metadata][ali_company_id]=co-1');
    expect(s).toContain('subscription_data[trial_end]=1800000000');
    expect(s).toContain('subscription_data[trial_settings][end_behavior][missing_payment_method]=cancel');
    expect(s).toContain('payment_method_collection=if_required');
  });
  it('seats are at least 1', () => {
    expect(aliCheckoutParams({ companyId: 'c', seats: 0, origin: 'o' }).line_items[0].quantity).toBe(1);
  });
});

describe('Stripe notifications', () => {
  const aliCheckout = { type: 'checkout.session.completed', data: { object: { id: 'cs_1', mode: 'subscription', metadata: { ali_company_id: 'co-1' }, subscription: 'sub_1', customer: 'cus_1' } } };
  const shopCheckout = { type: 'checkout.session.completed', data: { object: { id: 'cs_2', mode: 'payment', metadata: { product_slug: 'holding-the-line' } } } };

  it('routes ALI and shop events apart', () => {
    expect(routeStripeEvent(aliCheckout)).toBe('ali');
    expect(routeStripeEvent(shopCheckout)).toBe('shop');
    expect(routeStripeEvent({ type: 'checkout.session.async_payment_succeeded', data: { object: { mode: 'payment', metadata: {} } } })).toBe('shop');
    for (const t of ALI_STRIPE_EVENTS) expect(routeStripeEvent({ type: t, data: { object: {} } })).toBe('ali');
    expect(routeStripeEvent({ type: 'charge.refunded', data: { object: {} } })).toBe(null);
  });

  it('the webhook setup subscribes to every event both need', () => {
    for (const t of [...ALI_STRIPE_EVENTS, 'checkout.session.completed', 'checkout.session.async_payment_succeeded']) {
      expect(WEBHOOK_EVENTS).toContain(t);
    }
  });

  it('finds the company, subscription and customer in each kind of event', () => {
    expect(aliEventRefs(aliCheckout)).toEqual({ companyId: 'co-1', subscriptionId: 'sub_1', customerId: 'cus_1' });
    expect(
      aliEventRefs({ type: 'customer.subscription.updated', data: { object: { id: 'sub_1', customer: 'cus_1', metadata: { ali_company_id: 'co-1' } } } })
    ).toEqual({ companyId: 'co-1', subscriptionId: 'sub_1', customerId: 'cus_1' });
    // Newer Stripe invoices
    expect(
      aliEventRefs({
        type: 'invoice.paid',
        data: { object: { customer: 'cus_1', parent: { subscription_details: { subscription: 'sub_1', metadata: { ali_company_id: 'co-1' } } } } },
      })
    ).toEqual({ companyId: 'co-1', subscriptionId: 'sub_1', customerId: 'cus_1' });
    // Older Stripe invoices
    expect(
      aliEventRefs({ type: 'invoice.payment_failed', data: { object: { customer: 'cus_1', subscription: 'sub_1', subscription_details: { metadata: { ali_company_id: 'co-1' } } } } })
    ).toEqual({ companyId: 'co-1', subscriptionId: 'sub_1', customerId: 'cus_1' });
  });

  it('maps Stripe states to plain billing states', () => {
    expect(mapSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapSubscriptionStatus('active')).toBe('active');
    expect(mapSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapSubscriptionStatus('unpaid')).toBe('past_due');
    expect(mapSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapSubscriptionStatus('incomplete_expired')).toBe('canceled');
    expect(mapSubscriptionStatus('incomplete')).toBe('none');
  });

  it('a trialing subscription is paid through the trial end; an active one through its period', () => {
    const trial = subscriptionToBilling({ id: 'sub_1', customer: 'cus_1', status: 'trialing', trial_end: 1800000000, items: { data: [{ quantity: 2, current_period_end: 1800000000 }] } });
    expect(trial).toEqual({
      stripe_subscription_id: 'sub_1',
      stripe_customer_id: 'cus_1',
      billing_status: 'trialing',
      cancel_at_period_end: false,
      paid_through: new Date(1800000000 * 1000).toISOString(),
      leader_seats: 2,
    });
    const active = subscriptionToBilling({ id: 'sub_1', customer: { id: 'cus_1' }, status: 'active', current_period_end: 1830000000, cancel_at_period_end: true, items: { data: [{ quantity: 1 }] } });
    expect(active.billing_status).toBe('active');
    expect(active.cancel_at_period_end).toBe(true);
    expect(active.stripe_customer_id).toBe('cus_1');
    expect(active.paid_through).toBe(new Date(1830000000 * 1000).toISOString());
    expect(subscriptionToBilling(null)).toBe(null);
  });
});

describe('billing page state', () => {
  const settings = { priceCents: 14900, pilotSlots: 20, enforced: false, productId: null };
  it('a new company sees the free pilot offer while spots are left', () => {
    const v = billingView({ billing: null, settings, stripeOn: true, grantedCount: 3, isOwner: true, now: NOW });
    expect(v.priceLabel).toBe('$149');
    expect(v.founding).toBe(true);
    expect(v.startsPilot).toBe(true);
    expect(v.canStart).toBe(true);
    expect(v.canManage).toBe(false);
    expect(v.pilotSpotsLeft).toBe(17);
  });
  it('after 20 pilots a new company sees Subscribe', () => {
    const v = billingView({ billing: null, settings, stripeOn: true, grantedCount: 20, isOwner: true, now: NOW });
    expect(v.startsPilot).toBe(false);
    expect(v.canStart).toBe(true);
  });
  it('a subscribed company can manage, not start again; a viewer can do neither', () => {
    const billing = { billing_status: 'active', stripe_subscription_id: 'sub_1', stripe_customer_id: 'cus_1', leader_seats: 2 };
    const v = billingView({ billing, settings, stripeOn: true, grantedCount: 20, isOwner: true, now: NOW });
    expect(v.canStart).toBe(false);
    expect(v.canManage).toBe(true);
    expect(v.seats).toBe(2);
    const viewer = billingView({ billing, settings, stripeOn: true, grantedCount: 20, isOwner: false, now: NOW });
    expect(viewer.canManage).toBe(false);
    expect(viewer.canStart).toBe(false);
  });
  it('says plainly when billing is not switched on', () => {
    const v = billingView({ billing: null, settings, stripeOn: false, grantedCount: null, isOwner: true, now: NOW });
    expect(v.billingOn).toBe(false);
    expect(v.canStart).toBe(false);
    expect(v.roundsAllowed).toBe(true);
  });
});
