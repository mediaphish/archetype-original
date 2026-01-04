/**
 * ALI Billing & Subscription
 * 
 * Get subscription and billing information
 * 
 * GET /api/ali/billing?companyId=xxx
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Get company info
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, subscription_status, subscription_plan, subscription_amount, subscription_interval, subscription_current_period_end')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // TODO: Integrate with Stripe to get:
    // - Payment method details
    // - Invoice history
    // - Subscription status from Stripe
    // For now, return basic structure

    // Default subscription data
    const subscription = {
      status: company.subscription_status || 'trial',
      plan: company.subscription_plan || 'ali_annual',
      amount: company.subscription_amount || 9999, // cents
      interval: company.subscription_interval || 'year',
      current_period_end: company.subscription_current_period_end || null
    };

    // TODO: Fetch from Stripe
    const payment_method = {
      brand: null, // 'visa', 'mastercard', etc.
      last4: null
    };

    // TODO: Fetch from Stripe
    const invoices = [];

    return res.status(200).json({
      subscription,
      payment_method,
      invoices
    });

  } catch (err) {
    console.error('Billing error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

