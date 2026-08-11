/**
 * Client-executed Auto tool handlers (JARVIS Phase 1 + Phase 2 verify_quote).
 * Called mid-turn when the model emits tool_use blocks for custom tools.
 * Anthropic server tools (web_search) are never handled here.
 */
import { supabaseAdmin } from '../supabase-admin.js';
import { generateDesignImage } from './generateDesignImage.js';
import { generateQuoteCardImage } from './generateQuoteCardImage.js';
import { scheduleJournalLaunchCaptions } from './scheduleJournalLaunchCaptions.js';
import { storeImageSeriesMemory } from './editorialMemory.js';
import { logActivity } from './logActivity.js';

function canonicalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extractPartNumber(slug) {
  const match = String(slug || '').match(/-part-(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

function deriveSeriesSlug(slug) {
  return String(slug || '').replace(/-part-\d+.*$/i, '') || slug;
}

async function getExistingDraftBySlug(email, slug, kind) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('id, slug, kind, series_slug, part_number, title, status, image_url, content')
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('slug', slug)
      .eq('kind', kind)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
}

async function handleSaveDraft(input, ctx) {
  const email = ctx?.email;
  if (!email) return { ok: false, error: 'No authenticated email for save_draft' };

  const kind = String(input?.kind || '').trim();
  if (!['journal', 'devotional', 'captions'].includes(kind)) {
    return { ok: false, error: `Invalid kind "${kind}"` };
  }

  const slug = canonicalizeSlug(input?.slug);
  const title = String(input?.title || '').trim() || slug;
  const content = String(input?.content || '').trim();
  const status = String(input?.status || 'draft').trim();
  if (!slug) return { ok: false, error: 'slug is required' };
  if (!content) return { ok: false, error: 'content is required' };
  if (!['draft', 'approved'].includes(status)) {
    return { ok: false, error: `Invalid status "${status}"` };
  }

  // Identity is (email, slug, kind). series_slug/part_number are metadata only.
  const existing = await getExistingDraftBySlug(email, slug, kind);
  const inputSeries = input?.series_slug ? canonicalizeSlug(input.series_slug) : '';
  const inputPartProvided = input?.part_number != null && input.part_number !== '';
  const series_slug =
    inputSeries ||
    (existing?.series_slug ? String(existing.series_slug) : '') ||
    deriveSeriesSlug(slug) ||
    'standalone';
  const part_number = inputPartProvided
    ? parseInt(input.part_number, 10) || 1
    : existing?.part_number != null
      ? parseInt(existing.part_number, 10) || 1
      : extractPartNumber(slug);

  const preservedImageUrl = existing?.image_url || null;
  const row = {
    created_by_email: email.toLowerCase().trim(),
    kind,
    series_slug,
    part_number,
    title,
    slug,
    content,
    status,
    image_url: preservedImageUrl || null,
    updated_at: new Date().toISOString(),
  };
  if (status === 'approved') {
    row.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('ao_content_drafts')
    .upsert(row, {
      onConflict: 'created_by_email,slug,kind',
      ignoreDuplicates: false,
    })
    .select('id, slug, kind, status, series_slug, part_number, title')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    id: data?.id || existing?.id || null,
    slug: data?.slug || slug,
    kind: data?.kind || kind,
    status: data?.status || status,
    series_slug: data?.series_slug || series_slug,
    part_number: data?.part_number != null ? data.part_number : part_number,
    title: data?.title || title,
  };
}

async function handleApproveDraft(input, ctx) {
  const email = ctx?.email;
  if (!email) return { ok: false, error: 'No authenticated email for approve_draft' };
  const slug = canonicalizeSlug(input?.slug);
  if (!slug) return { ok: false, error: 'slug is required' };

  const { data, error } = await supabaseAdmin
    .from('ao_content_drafts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('created_by_email', email.toLowerCase().trim())
    .eq('slug', slug)
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .select('id, slug, title, status, kind')
    .limit(1);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return { ok: false, error: `No pending draft found for slug "${slug}"` };
  }
  return { ok: true, slug: data[0].slug, title: data[0].title, status: data[0].status, kind: data[0].kind };
}

async function handlePublishJournal(input, ctx) {
  // Publish remains a UI confirmation checkpoint. The tool records intent and
  // returns instructions for Bart to confirm via the existing Ready-to-publish bar.
  const slug = canonicalizeSlug(input?.slug);
  if (!slug) return { ok: false, error: 'slug is required' };
  return {
    ok: true,
    slug,
    series_slug: input?.series_slug ? canonicalizeSlug(input.series_slug) : null,
    part_number: input?.part_number != null ? parseInt(input.part_number, 10) || null : null,
    requires_ui_confirmation: true,
    message:
      'Publish intent recorded. Bart must still confirm via the Ready-to-publish control before the live site is updated.',
  };
}

async function attachImageUrlToDraft({ email, slug, imageUrl, kind = 'journal' }) {
  if (!email || !imageUrl) return { attached: false };
  const emailNorm = email.toLowerCase().trim();
  const targetSlug = canonicalizeSlug(slug);
  if (!targetSlug) return { attached: false };

  const { data, error } = await supabaseAdmin
    .from('ao_content_drafts')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('created_by_email', emailNorm)
    .eq('slug', targetSlug)
    .eq('kind', kind)
    .neq('status', 'published')
    .neq('status', 'abandoned')
    .select('id, slug')
    .limit(1);
  if (!error && data?.length) {
    return { attached: true, id: data[0].id, slug: data[0].slug };
  }
  return { attached: false };
}

async function handleGenerateImage(input, ctx) {
  const intent = String(input?.intent || '').trim();
  if (!['attach_for_reference', 'header_image_for_post'].includes(intent)) {
    return { ok: false, error: `Invalid intent "${intent}"` };
  }
  const prompt_description = String(input?.prompt_description || '').trim();
  if (!prompt_description) return { ok: false, error: 'prompt_description is required' };
  const slug = canonicalizeSlug(input?.slug);
  if (intent === 'header_image_for_post' && !slug) {
    return { ok: false, error: 'slug is required when intent is header_image_for_post' };
  }

  const size = input?.size || '1536x1024';
  const content_type = input?.content_type || 'journal_header';
  const series_slug = input?.series_slug ? canonicalizeSlug(input.series_slug) : null;
  const part_number =
    input?.part_number != null && input.part_number !== ''
      ? parseInt(input.part_number, 10) || null
      : null;

  const generated = await generateDesignImage({
    prompt: prompt_description,
    content_type,
    title: slug || series_slug || 'AO image',
    size,
  });
  if (!generated?.ok || !generated.image_url) {
    return { ok: false, error: generated?.error || 'Image generation failed' };
  }

  let attach = { attached: false };
  if (intent === 'header_image_for_post') {
    attach = await attachImageUrlToDraft({
      email: ctx?.email,
      slug,
      imageUrl: generated.image_url,
      kind: 'journal',
    });
    if (series_slug && part_number != null) {
      try {
        await storeImageSeriesMemory({
          email: ctx?.email,
          seriesSlug: series_slug,
          partSlug: slug || `${series_slug}-part-${part_number}`,
          partNumber: part_number,
          imageUrl: generated.image_url,
          prompt: prompt_description,
        });
      } catch (err) {
        console.warn('[autoToolHandlers] storeImageSeriesMemory:', err?.message || err);
      }
    }
  }

  try {
    await logActivity({
      action_type: 'design_image_generated',
      source: 'autoToolHandlers:generate_image',
      created_by_email: ctx?.email || null,
      detail: { intent, slug, series_slug, part_number, image_url: generated.image_url },
    });
  } catch (_) {
    /* non-fatal */
  }

  return {
    ok: true,
    intent,
    slug: slug || null,
    series_slug,
    part_number,
    image_url: generated.image_url,
    path: generated.path || null,
    attached_to_draft: !!attach.attached,
    attached_slug: attach.slug || null,
    message:
      intent === 'header_image_for_post'
        ? attach.attached
          ? `Header image generated and saved to draft ${attach.slug}.`
          : 'Header image generated but no matching draft was found to attach it to.'
        : 'Reference image generated (not attached as a post header).',
  };
}

async function handleScheduleCaptions(input, ctx) {
  const slug = canonicalizeSlug(input?.slug);
  if (!slug) return { ok: false, error: 'slug is required' };
  const captions = input?.captions;
  if (!captions || typeof captions !== 'object') {
    return { ok: false, error: 'captions object is required' };
  }

  return scheduleJournalLaunchCaptions({
    email: ctx?.email,
    slug,
    title: input?.title || null,
    captions,
  });
}

async function handleGenerateQuoteCard(input, ctx) {
  const quote_text = String(input?.quote_text || '').trim();
  const source_slug = canonicalizeSlug(input?.source_slug);
  if (!quote_text) return { ok: false, error: 'quote_text is required' };
  if (!source_slug) return { ok: false, error: 'source_slug is required' };

  // Phase 2 gate: refuse cards whose quote is not a near-exact substring of source content.
  const verified = await handleVerifyQuote({ quote_text, source_slug }, ctx);
  if (!verified?.verified) {
    return {
      ok: false,
      verified: false,
      source_slug,
      quote_text,
      error:
        verified?.error ||
        'Quote failed verification against source content. Fetch the real text and try again.',
    };
  }

  const card = await generateQuoteCardImage({
    line1: quote_text,
    line2: '',
    theme: 'dark',
  });
  if (!card?.ok || !card.image_url) {
    return { ok: false, error: card?.error || 'Quote card generation failed' };
  }

  return {
    ok: true,
    verified: true,
    source_slug,
    quote_text,
    image_url: card.image_url,
    path: card.path || null,
    filename: card.filename || null,
  };
}

async function handleTriggerReshare(input) {
  const slug = input?.slug ? canonicalizeSlug(input.slug) : null;
  try {
    const { runReshareCycle } = await import('../../api/ao/auto/reshare-journal.js');
    const result = await runReshareCycle(slug || null);
    if (!result?.ok) {
      return {
        ok: false,
        error: result?.error || result?.detail || 'Reshare engine did not complete',
        slug,
      };
    }
    return {
      ok: true,
      slug: slug || result.journal_slug || null,
      title: result.title || null,
      journal_url: result.journal_url || null,
      selection_reason: result.selection_reason || null,
      pull_quote: result.pull_quote || null,
      captions: result.captions || null,
      image_url: result.image_url || null,
      photo: result.photo || null,
      signal_strength: result.signal_strength || null,
      opportunity_id: result.opportunity_id || null,
      signal_source_name: result.signal_source_name || null,
      signal_summary: result.signal_summary || null,
      message: result.message || 'Reshare cycle completed (pending review).',
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), slug };
  }
}

async function handleFetchFullText(input, ctx) {
  const target_type = String(input?.target_type || '').trim();
  const slug = canonicalizeSlug(input?.slug);
  if (!['corpus_document', 'draft'].includes(target_type)) {
    return { ok: false, error: `Invalid target_type "${target_type}"` };
  }
  if (!slug) return { ok: false, error: 'slug is required' };

  if (target_type === 'draft') {
    const email = ctx?.email;
    if (!email) return { ok: false, error: 'No authenticated email for draft fetch' };
    const { data, error } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('slug, title, kind, status, content, image_url, updated_at')
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('slug', slug)
      .in('kind', ['journal', 'devotional'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: `No draft found for slug "${slug}"` };
    if (!data.content) {
      return {
        ok: false,
        error: `Draft "${slug}" exists but content is empty`,
        image_url: data.image_url || null,
      };
    }
    return {
      ok: true,
      target_type,
      slug: data.slug,
      title: data.title,
      kind: data.kind,
      status: data.status,
      content: data.content,
      image_url: data.image_url || null,
    };
  }

  // corpus_document — prefer knowledge.json body, then markdown file.
  try {
    const fs = await import('fs');
    const path = await import('path');
    const root = process.cwd();
    const knowledgePath = path.join(root, 'public/knowledge.json');
    if (fs.existsSync(knowledgePath)) {
      const docs = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
      const list = Array.isArray(docs) ? docs : docs?.documents || docs?.entries || [];
      const hit = list.find((d) => d?.slug === slug);
      if (hit?.body || hit?.content) {
        return {
          ok: true,
          target_type,
          slug,
          title: hit.title || slug,
          publish_date: hit.publish_date || hit.date || null,
          summary: hit.summary || hit.email_summary || '',
          content: String(hit.body || hit.content).trim(),
        };
      }
    }
    const candidates = [
      path.join(root, 'ao-knowledge-hq-kit/journal', `${slug}.md`),
      path.join(root, 'ao-knowledge-hq-kit/journal/devotionals', `${slug}.md`),
      path.join(root, 'ao-knowledge-hq-kit/faqs', `${slug}.md`),
    ];
    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const fmEnd = raw.indexOf('\n---', 3);
      const body = fmEnd >= 0 ? raw.slice(fmEnd + 4).trim() : raw.trim();
      const title = ((raw.match(/^title:\s*(.+)$/m) || [])[1] || slug).trim().replace(/^['"]|['"]$/g, '');
      return { ok: true, target_type, slug, title, content: body };
    }
    return { ok: false, error: `Corpus document not found for slug "${slug}"` };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function handleVerifyQuote(input, ctx = {}) {
  const quote_text = String(input?.quote_text || '').trim();
  const source_slug = canonicalizeSlug(input?.source_slug);
  if (!quote_text) return { ok: false, error: 'quote_text is required' };
  if (!source_slug) return { ok: false, error: 'source_slug is required' };

  const fetched = await handleFetchFullText({ target_type: 'corpus_document', slug: source_slug }, ctx);
  if (!fetched.ok) {
    // Try draft as fallback
    const draftFetch = await handleFetchFullText({ target_type: 'draft', slug: source_slug }, ctx);
    if (!draftFetch.ok) return { ok: false, verified: false, error: fetched.error };
    return verifyAgainstBody(quote_text, source_slug, draftFetch.content);
  }
  return verifyAgainstBody(quote_text, source_slug, fetched.content);
}

function normalizeForQuoteMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'"]/g, '')
    .trim();
}

function verifyAgainstBody(quote_text, source_slug, body) {
  const q = normalizeForQuoteMatch(quote_text);
  const b = normalizeForQuoteMatch(body);
  const verified = q.length >= 12 && b.includes(q);
  return {
    ok: verified,
    verified,
    source_slug,
    quote_text,
    error: verified ? undefined : 'Quote text was not found as a near-exact substring of the source document.',
  };
}

/**
 * Execute one client tool by name.
 * @returns {Promise<object>} JSON-serializable tool_result payload
 */
export async function executeAutoTool(name, input, ctx = {}) {
  try {
    switch (name) {
      case 'save_draft':
        return await handleSaveDraft(input, ctx);
      case 'approve_draft':
        return await handleApproveDraft(input, ctx);
      case 'publish_journal':
        return await handlePublishJournal(input, ctx);
      case 'generate_image':
        return await handleGenerateImage(input, ctx);
      case 'schedule_captions':
        return await handleScheduleCaptions(input, ctx);
      case 'generate_quote_card':
        return await handleGenerateQuoteCard(input, ctx);
      case 'trigger_reshare':
        return await handleTriggerReshare(input, ctx);
      case 'fetch_full_text':
        return await handleFetchFullText(input, ctx);
      case 'verify_quote':
        return await handleVerifyQuote(input, ctx);
      default:
        return { ok: false, error: `Unknown or unsupported client tool: ${name}` };
    }
  } catch (err) {
    console.error(`[autoToolHandlers] ${name} threw:`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Exported for regression selftests — production callers should use executeAutoTool. */
export { handleSaveDraft };

export function getEnabledClientToolSchemas(enabledNames) {
  // Lazy import to avoid circular init issues at module load in some runners.
  // Caller should pass AUTO_TOOL_SCHEMAS filtered by name.
  return enabledNames;
}
