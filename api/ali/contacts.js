/**
 * ALI Contact Management
 * 
 * Add, update, or list contacts for a company
 * 
 * GET /api/ali/contacts?companyId=xxx
 * POST /api/ali/contacts
 * PATCH /api/ali/contacts/:id
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const { method } = req;
  const { companyId, contactId } = req.query;

  try {
    // GET - List contacts for a company
    if (method === 'GET') {
      if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const { data: contacts, error } = await supabaseAdmin
        .from('ali_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        return res.status(500).json({ error: 'Failed to fetch contacts' });
      }

      return res.status(200).json({ contacts });
    }

    // POST - Add a new contact
    if (method === 'POST') {
      const {
        companyId: bodyCompanyId,
        email,
        fullName,
        role,
        permissionLevel = 'view_only'
      } = req.body || {};

      const targetCompanyId = companyId || bodyCompanyId;

      if (!targetCompanyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }

      if (!fullName || fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Full name is required (minimum 2 characters)' });
      }

      if (!['account_owner', 'view_only'].includes(permissionLevel)) {
        return res.status(400).json({ error: 'permissionLevel must be "account_owner" or "view_only"' });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already exists for this company
      const { data: existing } = await supabaseAdmin
        .from('ali_contacts')
        .select('id')
        .eq('company_id', targetCompanyId)
        .eq('email', normalizedEmail)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Contact with this email already exists for this company' });
      }

      // Verify company exists
      const { data: company } = await supabaseAdmin
        .from('ali_companies')
        .select('id')
        .eq('id', targetCompanyId)
        .single();

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const { data: contact, error: contactError } = await supabaseAdmin
        .from('ali_contacts')
        .insert({
          company_id: targetCompanyId,
          email: normalizedEmail,
          full_name: fullName.trim(),
          role: role?.trim() || null,
          permission_level: permissionLevel
        })
        .select()
        .single();

      if (contactError) {
        console.error('Error creating contact:', contactError);
        return res.status(500).json({ error: 'Failed to create contact' });
      }

      return res.status(201).json({
        success: true,
        contact
      });
    }

    // PATCH - Update a contact
    if (method === 'PATCH') {
      const updateId = contactId || req.body?.id;

      if (!updateId) {
        return res.status(400).json({ error: 'contactId is required' });
      }

      const {
        fullName,
        role,
        permissionLevel
      } = req.body || {};

      const updates = {};

      if (fullName !== undefined) {
        if (fullName.trim().length < 2) {
          return res.status(400).json({ error: 'Full name must be at least 2 characters' });
        }
        updates.full_name = fullName.trim();
      }

      if (role !== undefined) {
        updates.role = role?.trim() || null;
      }

      if (permissionLevel !== undefined) {
        if (!['account_owner', 'view_only'].includes(permissionLevel)) {
          return res.status(400).json({ error: 'permissionLevel must be "account_owner" or "view_only"' });
        }
        updates.permission_level = permissionLevel;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: contact, error } = await supabaseAdmin
        .from('ali_contacts')
        .update(updates)
        .eq('id', updateId)
        .select()
        .single();

      if (error) {
        console.error('Error updating contact:', error);
        return res.status(500).json({ error: 'Failed to update contact' });
      }

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      return res.status(200).json({
        success: true,
        contact
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

