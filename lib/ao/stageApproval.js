/**
 * Recording Bart's approval of one step of a journal post.
 *
 * One write, used by both ways Bart approves: the panel's buttons
 * (api/ao/auto/approve-stage.js) and Auto's approve_stage tool.
 *
 * Why the tool exists. "Your Tuesday", 2026-09-15: Bart approved the image and
 * captions in chat. Auto had no tool that could record either, so nothing was
 * saved. The panel stayed on Image, and the two manual captions (LinkedIn
 * Business, Facebook Personal) existed only in the chat thread. Auto said so
 * itself: "these two captions exist only in this chat thread right now."
 *
 * Stored on the draft's metadata jsonb:
 *   metadata.stage_approvals = { image: { approved_at }, captions: { approved_at } }
 *   metadata.approved_captions = { linkedin_business: "...", ... }
 *
 * Approved captions live in metadata, never in the post body, so they cannot be
 * published to the site as part of the post.
 */
import { contentDrafts } from '../db/contentDrafts.js';
import { canApproveGate } from './draftStage.js';
import { buildCaptionsPanel, findChatCaptionsMessage, mergeChatCaptions } from './journalPanelData.js';
import { APPROVABLE_STAGES, cleanCaptions, bartApprovedInMessage } from './stageApprovalRules.js';

export { APPROVABLE_STAGES, cleanCaptions, bartApprovedInMessage };

/**
 * Write one approval. Returns { ok, status, error? } so the API can pass the
 * status straight through and the tool can return the same result.
 */
export async function recordStageApproval({ email, slug, stage, captions = null }) {
  const owner = String(email || '').toLowerCase().trim();
  const targetSlug = String(slug || '').trim();
  const gate = String(stage || '').trim();

  if (!owner) return { ok: false, status: 401, error: 'No authenticated email' };
  if (!targetSlug) return { ok: false, status: 400, error: 'slug is required' };
  if (!APPROVABLE_STAGES.has(gate)) return { ok: false, status: 400, error: 'stage must be image or captions' };

  const { data: draft, error: loadError } = await contentDrafts()
    .select('id, slug, status, approved_at, published_at, image_url, content, metadata')
    .eq('created_by_email', owner)
    .eq('kind', 'journal')
    .eq('slug', targetSlug)
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadError) return { ok: false, status: 500, error: loadError.message };
  if (!draft) return { ok: false, status: 404, error: `No journal draft found for slug "${targetSlug}"` };

  const allowed = canApproveGate(draft, gate);
  if (!allowed.ok) return { ok: false, status: 409, error: allowed.error };

  const metadata = draft.metadata && typeof draft.metadata === 'object' ? { ...draft.metadata } : {};
  const approvals = { ...(metadata.stage_approvals || {}) };
  const now = new Date().toISOString();

  if (gate === 'image') {
    if (!draft.image_url) {
      return { ok: false, status: 409, error: 'There is no image saved on this draft to approve.' };
    }
    approvals.image = { approved_at: now, image_url: draft.image_url };
  }

  let approvedCaptions = null;
  if (gate === 'captions') {
    approvedCaptions = cleanCaptions(captions);
    if (!Object.keys(approvedCaptions).length) {
      return { ok: false, status: 400, error: 'No captions were found to approve.' };
    }
    metadata.approved_captions = approvedCaptions;
    approvals.captions = { approved_at: now, channels: Object.keys(approvedCaptions) };
  }

  metadata.stage_approvals = approvals;

  const { error: updateError } = await contentDrafts()
    .update({ metadata, updated_at: now })
    .eq('id', draft.id);
  if (updateError) return { ok: false, status: 500, error: updateError.message };

  return {
    ok: true,
    status: 200,
    slug: draft.slug,
    stage: gate,
    stage_approvals: approvals,
    ...(approvedCaptions ? { approved_captions: approvedCaptions } : {}),
  };
}

/**
 * The caption set to approve when Auto records the approval: what the panel
 * shows. Scheduled text first (it is what will post), then saved and approved
 * text, then the newest caption set for this post in the chat thread. Captions
 * Auto passes explicitly win over all of it, because they are what Bart just
 * read and approved.
 */
export async function loadCaptionsForApproval({ email, slug, threadId = null, explicit = null }) {
  const owner = String(email || '').toLowerCase().trim();
  let scheduledRows = [];
  try {
    const { loadJournalCaptionRows } = await import('./getScheduleStatus.js');
    scheduledRows = await loadJournalCaptionRows(slug);
  } catch (err) {
    console.warn('[stageApproval] scheduled caption lookup failed:', err?.message || err);
  }

  let captionsDraftContent = '';
  let approvedCaptions = {};
  let title = null;
  try {
    const { data: capRows } = await contentDrafts()
      .select('content')
      .eq('created_by_email', owner)
      .eq('kind', 'captions')
      .eq('slug', slug)
      .neq('status', 'abandoned')
      .order('updated_at', { ascending: false })
      .limit(1);
    captionsDraftContent = capRows?.[0]?.content || '';
    const { data: post } = await contentDrafts()
      .select('title, metadata')
      .eq('created_by_email', owner)
      .eq('kind', 'journal')
      .eq('slug', slug)
      .neq('status', 'abandoned')
      .order('updated_at', { ascending: false })
      .limit(1);
    approvedCaptions = post?.[0]?.metadata?.approved_captions || {};
    title = post?.[0]?.title || null;
  } catch (err) {
    console.warn('[stageApproval] captions draft lookup failed:', err?.message || err);
  }

  let chatText = null;
  if (threadId) {
    try {
      const { supabaseAdmin } = await import('../supabase-admin.js');
      const { data: messages } = await supabaseAdmin
        .from('ao_auto_messages')
        .select('role, content, created_at')
        .eq('thread_id', threadId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(80);
      chatText = findChatCaptionsMessage([...(messages || [])].reverse(), { slug, title });
    } catch (err) {
      console.warn('[stageApproval] chat caption lookup failed:', err?.message || err);
    }
  }

  const panel = mergeChatCaptions(
    buildCaptionsPanel({ scheduledRows, captionsDraftContent, approvedCaptions }),
    chatText
  );
  const fromPanel = Object.fromEntries(panel.filter((c) => c.text).map((c) => [c.key, c.text]));
  return { ...fromPanel, ...cleanCaptions(explicit) };
}
