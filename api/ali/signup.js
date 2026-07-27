/**
 * ALI Company Signup
 * 
 * Auto-creates company and first contact (Account Owner)
 * This is the entry point when someone signs up for ALI
 * 
 * POST /api/ali/signup
 * Body: {
 *   companyName: string (required)
 *   companySize: string (required)
 *   website?: string
 *   industry?: string
 *   contactEmail: string (required)
 *   contactName: string (required)
 *   contactRole?: string
 *   pilotProgram?: boolean
 * }
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      companyName,
      companySize,
      website,
      industry,
      contactEmail,
      contactName,
      contactRole,
      pilotProgram = false,
      acceptPrivacyPolicy = false,
      acceptTermsConditions = false,
      acceptEULA = false
    } = req.body || {};

    // Validation
    if (!companyName || companyName.trim().length < 2) {
      return res.status(400).json({ error: 'Company name is required (minimum 2 characters)' });
    }

    if (!companySize) {
      return res.status(400).json({ error: 'Company size is required' });
    }

    if (!contactEmail || !contactEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid contact email is required' });
    }

    if (!contactName || contactName.trim().length < 2) {
      return res.status(400).json({ error: 'Contact name is required (minimum 2 characters)' });
    }

    // Validate legal acceptances
    if (!acceptPrivacyPolicy || !acceptTermsConditions || !acceptEULA) {
      return res.status(400).json({ 
        error: 'You must accept the Privacy Policy, Terms & Conditions, and ALI EULA to create an account' 
      });
    }

    const normalizedEmail = contactEmail.trim().toLowerCase();
    const normalizedCompanyName = companyName.trim();

    // Check if company already exists
    const { data: existingCompany } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name')
      .eq('name', normalizedCompanyName)
      .single();

    if (existingCompany) {
      return res.status(409).json({ 
        error: 'Company already exists',
        companyId: existingCompany.id
      });
    }

    // Check if email is already a contact for another company
    const { data: existingContact } = await supabaseAdmin
      .from('ali_contacts')
      .select('company_id, email')
      .eq('email', normalizedEmail)
      .single();

    if (existingContact) {
      return res.status(409).json({ 
        error: 'This email is already associated with another company',
        companyId: existingContact.company_id
      });
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .insert({
        name: normalizedCompanyName,
        company_size: companySize,
        website: website?.trim() || null,
        industry: industry?.trim() || null,
        status: 'active',
        pilot_program: pilotProgram
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return res.status(500).json({ error: 'Failed to create company' });
    }

    // Create first contact as Account Owner
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('ali_contacts')
      .insert({
        company_id: company.id,
        email: normalizedEmail,
        full_name: contactName.trim(),
        role: contactRole?.trim() || null,
        permission_level: 'account_owner'
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
      // Rollback: delete company if contact creation fails
      await supabaseAdmin
        .from('ali_companies')
        .delete()
        .eq('id', company.id);
      
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    // Get current document version hashes
    const getCurrentVersion = async (docType) => {
      const { data } = await supabaseAdmin
        .from('ali_legal_document_versions')
        .select('version_hash')
        .eq('document_type', docType)
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data?.version_hash || 'v1-2026-01-31'; // Fallback
    };

    const privacyVersion = await getCurrentVersion('privacy_policy');
    const termsVersion = await getCurrentVersion('terms_conditions');
    const eulaVersion = await getCurrentVersion('eula');

    // Get IP address and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // Record legal acceptances
    const acceptances = [
      {
        company_id: company.id,
        contact_id: contact.id,
        document_type: 'privacy_policy',
        version_hash: privacyVersion,
        ip_address: ipAddress,
        user_agent: userAgent
      },
      {
        company_id: company.id,
        contact_id: contact.id,
        document_type: 'terms_conditions',
        version_hash: termsVersion,
        ip_address: ipAddress,
        user_agent: userAgent
      },
      {
        company_id: company.id,
        contact_id: contact.id,
        document_type: 'eula',
        version_hash: eulaVersion,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    ];

    const { error: acceptanceError } = await supabaseAdmin
      .from('ali_legal_acceptances')
      .insert(acceptances);

    if (acceptanceError) {
      console.error('Error recording legal acceptances:', acceptanceError);
      // Don't fail signup if acceptance logging fails, but log it
    }

    // Generate a real setup token (same table/pattern as the existing magic-link login flow)
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours — longer than login links since this is a one-time onboarding step

    const { error: setupTokenError } = await supabaseAdmin
      .from('ali_magic_link_tokens')
      .insert({
        email: normalizedEmail,
        token: setupToken,
        expires_at: setupExpiresAt.toISOString(),
        used: false,
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'] || null,
      });

    if (setupTokenError) {
      console.error('[ali/signup] Failed to create setup token:', setupTokenError.message);
      // Don't fail the whole signup over this — the account was created successfully.
      // The frontend will show a message and the contact can request a fresh link via
      // the existing send-magic-link flow if this one never arrives.
    } else {
      const siteUrl = process.env.SITE_URL || 'https://www.archetypeoriginal.com';
      const setupLink = `${siteUrl}/ali/setup-account?token=${setupToken}&email=${encodeURIComponent(normalizedEmail)}`;
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.log('[ali/signup] RESEND_API_KEY not configured — setup link (dev only):', setupLink);
      } else {
        const fromEmail = process.env.RESEND_FROM || 'Archetype Original <noreply@archetypeoriginal.com>';
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 10px;">Welcome to ALI</h1>
                <p style="color: #666; font-size: 16px;">Finish setting up your account to get started</p>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${setupLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                  Set Up My Account
                </a>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This link will expire in 24 hours. If you didn't sign up for ALI, you can safely ignore this email.
              </p>
            </body>
          </html>
        `;

        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromEmail, to: normalizedEmail, subject: 'Welcome to ALI — set up your account', html: emailHtml }),
          });
          if (!emailResponse.ok) {
            console.error('[ali/signup] Setup email send failed:', await emailResponse.text());
          }
        } catch (emailErr) {
          console.error('[ali/signup] Setup email send threw:', emailErr?.message || emailErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        companySize: company.company_size,
        status: company.status,
        pilotProgram: company.pilot_program
      },
      contact: {
        id: contact.id,
        email: contact.email,
        name: contact.full_name,
        permissionLevel: contact.permission_level
      },
      message: 'Company and account owner created successfully'
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

