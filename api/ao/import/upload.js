/**
 * AO Automation — Import inbox upload (multi-file).
 * POST /api/ao/import/upload
 *
 * Accepts markdown files as text payload, validates as devotionals, and stores
 * them in an inbox batch for later publish.
 *
 * Body:
 * {
 *   "kind": "devotional",
 *   "notes": "optional",
 *   "files": [{ "name": "2026-04-01-foo.md", "content": "...markdown..." }]
 * }
 */

import matter from 'gray-matter';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const DEFAULT_KIND = 'devotional';
const MAX_FILES = 50;
const MAX_TOTAL_CHARS = 1_500_000; // ~1.5MB of markdown text

function safeBasename(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  const parts = s.split(/[\\/]/g);
  return parts[parts.length - 1];
}

function validateDevotionalMarkdown(filename, content) {
  const errors = [];
  const name = safeBasename(filename);
  if (!name) errors.push('Missing filename.');
  if (name && !name.toLowerCase().endsWith('.md')) errors.push('File must end with .md');
  if (name && /[\r\n]/.test(name)) errors.push('Filename contains invalid characters.');
  if (name && name.length > 200) errors.push('Filename is too long.');

  const text = String(content || '');
  if (!text.trim()) errors.push('File is empty.');

  let frontmatter = null;
  let body = '';
  if (text.trim()) {
    try {
      const parsed = matter(text);
      frontmatter = parsed.data || {};
      body = (parsed.content || '').trim();
    } catch (e) {
      errors.push(`Could not parse frontmatter: ${e.message}`);
    }
  }

  const type = String(frontmatter?.type || '').trim().toLowerCase();
  if (type && type !== 'devotional') {
    errors.push(`Frontmatter type must be "devotional" (got "${type}").`);
  }
  if (!type) errors.push('Frontmatter missing "type: devotional".');

  const requiredFields = [
    'title',
    'slug',
    'publish_date',
    'scripture_reference',
    'summary',
  ];
  for (const f of requiredFields) {
    const v = frontmatter?.[f];
    if (!v || !String(v).trim()) errors.push(`Frontmatter missing "${f}".`);
  }

  const status = String(frontmatter?.status || '').trim().toLowerCase();
  if (status && status !== 'published') {
    errors.push('Frontmatter status should be "published".');
  }
  if (!status) errors.push('Frontmatter missing "status: published".');

  if (body) {
    const hasScripture = body.includes('## Scripture');
    const hasReflection = body.includes('## Reflection');
    const hasApp = body.includes('## Practical Application');
    const hasTakeaways = body.includes('## Takeaways');
    const hasClosing = body.includes('## Closing Thought');
    if (!hasScripture) errors.push('Body missing "## Scripture" section.');
    if (!hasReflection) errors.push('Body missing "## Reflection" section.');
    if (!hasApp) errors.push('Body missing "## Practical Application" section.');
    if (!hasTakeaways) errors.push('Body missing "## Takeaways" section.');
    if (!hasClosing) errors.push('Body missing "## Closing Thought" section.');
  }

  const targetPath = name ? `ao-knowledge-hq-kit/journal/devotionals/${name}` : '';
  return {
    ok: errors.length === 0,
    name,
    targetPath,
    frontmatter: frontmatter || null,
    validationErrors: errors,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const kind = String(req.body?.kind || DEFAULT_KIND).trim().toLowerCase() || DEFAULT_KIND;
  const notes = req.body?.notes ? String(req.body.notes).slice(0, 1000) : null;
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (files.length === 0) {
    return res.status(400).json({ ok: false, error: 'No files provided' });
  }
  if (files.length > MAX_FILES) {
    return res.status(400).json({ ok: false, error: `Too many files (max ${MAX_FILES})` });
  }

  let totalChars = 0;
  for (const f of files) {
    totalChars += String(f?.content || '').length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(400).json({ ok: false, error: 'Upload is too large' });
  }

  try {
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('ao_import_batches')
      .insert({
        kind,
        status: 'uploaded',
        created_by_email: auth.email || null,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (batchErr) {
      if (String(batchErr.message || '').includes('ao_import_batches')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
        });
      }
      return res.status(500).json({ ok: false, error: batchErr.message });
    }

    const itemsToInsert = files.map((f) => {
      const name = safeBasename(f?.name);
      const content = String(f?.content || '');
      const validated = validateDevotionalMarkdown(name, content);
      return {
        batch_id: batch.id,
        kind,
        filename: validated.name || name || 'unknown.md',
        target_path: validated.targetPath || `ao-knowledge-hq-kit/journal/devotionals/${validated.name || name || 'unknown.md'}`,
        status: validated.ok ? 'validated' : 'rejected',
        frontmatter: validated.frontmatter,
        validation_errors: validated.validationErrors,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const { data: insertedItems, error: itemsErr } = await supabaseAdmin
      .from('ao_import_items')
      .insert(itemsToInsert)
      .select('*');

    if (itemsErr) {
      await supabaseAdmin
        .from('ao_import_batches')
        .update({
          status: 'failed',
          publish_error: itemsErr.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batch.id);
      if (String(itemsErr.message || '').includes('ao_import_items')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
        });
      }
      return res.status(500).json({ ok: false, error: itemsErr.message });
    }

    const validatedCount = (insertedItems || []).filter((i) => i.status === 'validated').length;
    const rejectedCount = (insertedItems || []).filter((i) => i.status === 'rejected').length;

    return res.status(200).json({
      ok: true,
      batch: {
        id: batch.id,
        kind: batch.kind,
        status: batch.status,
        notes: batch.notes,
        created_at: batch.created_at,
        validated_count: validatedCount,
        rejected_count: rejectedCount,
      },
      items: insertedItems || [],
    });
  } catch (e) {
    console.error('[ao/import/upload]', e);
    if (String(e.message || '').toLowerCase().includes('does not exist') && String(e.message || '').includes('ao_import_')) {
      return res.status(500).json({
        ok: false,
        error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
}

