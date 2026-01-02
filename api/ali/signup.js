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
      pilotProgram = false
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

