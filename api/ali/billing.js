/**
 * ALI billing (2026-11-17): one yearly plan per leader, whole team included.
 *
 * GET  /api/ali/billing                    the company's billing state in plain terms
 * POST /api/ali/billing { action: 'checkout' }  start the plan (or the free pilot year)
 * POST /api/ali/billing { action: 'portal' }    open Stripe's page to update the card or cancel
 *
 * The company always comes from the signed-in session, never from the request.
 * Only the account owner can start a plan or open the billing page on Stripe.
 * See lib/ali-billing.js for the rules.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAliSession } from '../../lib/ali-session.js';
import { stripeReady } from '../../lib/shop/stripe.js';
import {
  billingSettings,
  billingView,
  countPilotsGranted,
  getCompanyBilling,
  startCheckout,
  startPortal,
} from '../../lib/ali-billing.js';

const NOT_ON = 'Billing is not switched on yet.';

async function ownerContact(session) {
  const { data: me } = await supabaseAdmin
    .from('ali_contacts')
    .select('id, company_id, email, permission_level')
    .eq('id', session.contactId)
    .maybeSingle();
  if (!me || me.company_id !== session.companyId) return { me: null, isOwner: false };
  return { me, isOwner: me.permission_level === 'account_owner' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const session = await requireAliSession(req, res);
  if (!session) return;

  if (!session.companyId) {
    return res.status(403).json({ ok: false, error: 'This action requires a company account.' });
  }

  const companyId = session.companyId;
  const origin = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';

  try {
    const { me, isOwner } = await ownerContact(session);
    if (!me) return res.status(403).json({ ok: false, error: 'This account is not part of this company.' });

    if (req.method === 'GET') {
      const stripeOn = stripeReady();
      const [billing, settings, grantedCount] = await Promise.all([
        getCompanyBilling(companyId),
        billingSettings(),
        countPilotsGranted(),
      ]);
      return res.status(200).json(billingView({ billing, settings, stripeOn, grantedCount, isOwner }));
    }

    const action = req.body?.action;
    if (action !== 'checkout' && action !== 'portal') {
      return res.status(400).json({ ok: false, error: 'Unknown billing action.' });
    }
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Only the account owner can change billing.' });
    }
    if (!stripeReady()) {
      return res.status(503).json({ ok: false, error: NOT_ON });
    }

    const out =
      action === 'checkout'
        ? await startCheckout({ companyId, email: me.email || null, origin })
        : await startPortal({ companyId, origin });
    if (out.error) return res.status(400).json({ ok: false, error: out.error });
    return res.status(200).json({ ok: true, url: out.url });
  } catch (err) {
    console.error('[ali/billing] error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Billing could not be reached. Please try again in a minute.' });
  }
}
