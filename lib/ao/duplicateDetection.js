/**
 * AO — Duplicate detection for quote candidates (normalize, hash, ao_quote_hashes).
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from '../supabase-admin.js';

/**
 * Normalize quote text for hashing (lowercase, trim, collapse whitespace).
 */
export function normalizeQuoteText(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Hash normalized text (SHA-256 hex).
 */
export function hashNormalized(normalized) {
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if this normalized hash already exists (exact duplicate).
 */
export async function isExactDuplicate(normalizedHash) {
  const { data, error } = await supabaseAdmin
    .from('ao_quote_hashes')
    .select('id')
    .eq('normalized_hash', normalizedHash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Store hash and optional quote_id for future duplicate checks.
 */
export async function storeQuoteHash(normalizedHash, quoteId = null) {
  const { error } = await supabaseAdmin.from('ao_quote_hashes').upsert(
    { normalized_hash: normalizedHash, quote_id: quoteId },
    { onConflict: 'normalized_hash' }
  );
  if (error) throw error;
}
