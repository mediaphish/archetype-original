/**
 * ALI Division Management
 * 
 * Create, update, list, or delete divisions for a company
 * 
 * GET /api/ali/divisions?companyId=xxx
 * POST /api/ali/divisions
 * PATCH /api/ali/divisions/:id
 * DELETE /api/ali/divisions/:id
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  const { method } = req;
  const { companyId, divisionId } = req.query;

  try {
    // GET - List divisions for a company
    if (method === 'GET') {
      if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const { data: divisions, error } = await supabaseAdmin
        .from('ali_divisions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching divisions:', error);
        return res.status(500).json({ error: 'Failed to fetch divisions' });
      }

      return res.status(200).json({ divisions });
    }

    // POST - Create a new division
    if (method === 'POST') {
      const {
        companyId: bodyCompanyId,
        name,
        parentDivisionId,
        description
      } = req.body || {};

      const targetCompanyId = companyId || bodyCompanyId;

      if (!targetCompanyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Division name is required (minimum 2 characters)' });
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

      // If parent division specified, verify it exists and belongs to same company
      if (parentDivisionId) {
        const { data: parentDivision } = await supabaseAdmin
          .from('ali_divisions')
          .select('id, company_id')
          .eq('id', parentDivisionId)
          .single();

        if (!parentDivision) {
          return res.status(404).json({ error: 'Parent division not found' });
        }

        if (parentDivision.company_id !== targetCompanyId) {
          return res.status(400).json({ error: 'Parent division must belong to the same company' });
        }
      }

      // Check if division name already exists for this company
      const { data: existing } = await supabaseAdmin
        .from('ali_divisions')
        .select('id')
        .eq('company_id', targetCompanyId)
        .eq('name', name.trim())
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Division with this name already exists for this company' });
      }

      const { data: division, error: divisionError } = await supabaseAdmin
        .from('ali_divisions')
        .insert({
          company_id: targetCompanyId,
          name: name.trim(),
          parent_division_id: parentDivisionId || null,
          description: description?.trim() || null,
          status: 'active'
        })
        .select()
        .single();

      if (divisionError) {
        console.error('Error creating division:', divisionError);
        return res.status(500).json({ error: 'Failed to create division' });
      }

      return res.status(201).json({
        success: true,
        division
      });
    }

    // PATCH - Update a division
    if (method === 'PATCH') {
      const updateId = divisionId || req.body?.id;

      if (!updateId) {
        return res.status(400).json({ error: 'divisionId is required' });
      }

      const {
        name,
        description,
        status
      } = req.body || {};

      const updates = {};

      if (name !== undefined) {
        if (name.trim().length < 2) {
          return res.status(400).json({ error: 'Division name must be at least 2 characters' });
        }
        updates.name = name.trim();
      }

      if (description !== undefined) {
        updates.description = description?.trim() || null;
      }

      if (status !== undefined) {
        if (!['active', 'inactive'].includes(status)) {
          return res.status(400).json({ error: 'status must be "active" or "inactive"' });
        }
        updates.status = status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: division, error } = await supabaseAdmin
        .from('ali_divisions')
        .update(updates)
        .eq('id', updateId)
        .select()
        .single();

      if (error) {
        console.error('Error updating division:', error);
        return res.status(500).json({ error: 'Failed to update division' });
      }

      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }

      return res.status(200).json({
        success: true,
        division
      });
    }

    // DELETE - Delete a division
    if (method === 'DELETE') {
      const deleteId = divisionId || req.query?.id;

      if (!deleteId) {
        return res.status(400).json({ error: 'divisionId is required' });
      }

      // Check if division has child divisions
      const { data: children } = await supabaseAdmin
        .from('ali_divisions')
        .select('id')
        .eq('parent_division_id', deleteId)
        .limit(1);

      if (children && children.length > 0) {
        return res.status(400).json({ error: 'Cannot delete division with sub-divisions. Delete sub-divisions first.' });
      }

      const { error } = await supabaseAdmin
        .from('ali_divisions')
        .delete()
        .eq('id', deleteId);

      if (error) {
        console.error('Error deleting division:', error);
        return res.status(500).json({ error: 'Failed to delete division' });
      }

      return res.status(200).json({
        success: true,
        message: 'Division deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

