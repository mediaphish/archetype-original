import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireBlpAdmin } from '../lib/badLeaderAuth.js';
import { classifyAliConditions, createEmbedding, detectStoryTone, neutralizeStory } from '../lib/badLeaderAi.js';

async function buildStoryForFlaggedSubmission(submission) {
  const toneResult = await detectStoryTone(submission.original_story);
  const tone = toneResult?.tone === 'exemplary' ? 'exemplary' : 'dysfunctional';
  const neutralizedText = await neutralizeStory(submission.original_story);
  const classification = await classifyAliConditions(neutralizedText, tone);
  const conditions = Array.isArray(classification?.conditions) ? classification.conditions : [];
  const confidence = ['high', 'medium', 'low'].includes(classification?.confidence) ? classification.confidence : 'medium';
  const scoreboard = tone === 'dysfunctional' ? Boolean(classification?.scoreboard_leadership) : false;
  const embedding = await createEmbedding(neutralizedText);
  const embeddingValue = embedding.length > 0 ? `[${embedding.join(',')}]` : null;

  const { data: story, error: storyErr } = await supabaseAdmin
    .from('blp_stories')
    .insert({
      submission_id: submission.id,
      region: submission.region,
      industry: submission.industry,
      neutralized_text: neutralizedText,
      tone,
      ali_conditions: conditions.map((c) => String(c).toLowerCase()),
      scoreboard_leadership: scoreboard,
      classification_confidence: confidence,
      embedding_vector: embeddingValue,
      status: 'pending',
    })
    .select('id')
    .single();
  if (storyErr) throw storyErr;

  await supabaseAdmin.from('blp_submissions').update({ tone, status: 'pending', relevance_decision: 'approve' }).eq('id', submission.id);
  await supabaseAdmin.from('blp_cluster_jobs').insert({ story_id: story.id, status: 'queued' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await requireBlpAdmin(req, res);
  if (!session) return;

  try {
    const submissionId = String(req.body?.submissionId || '').trim();
    const action = String(req.body?.action || '').trim();
    if (!submissionId || !action) return res.status(400).json({ error: 'submissionId and action are required.' });

    const { data: submission, error: readErr } = await supabaseAdmin
      .from('blp_submissions')
      .select('id, region, industry, original_story, relevance_decision')
      .eq('id', submissionId)
      .maybeSingle();
    if (readErr || !submission) return res.status(404).json({ error: 'Submission not found.' });

    if (action === 'approve') {
      await supabaseAdmin
        .from('blp_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId);
      await supabaseAdmin
        .from('blp_stories')
        .update({ status: 'approved', published_at: new Date().toISOString() })
        .eq('submission_id', submissionId);
      return res.status(200).json({ ok: true });
    }

    if (action === 'reject') {
      await supabaseAdmin.from('blp_submissions').update({ status: 'rejected' }).eq('id', submissionId);
      await supabaseAdmin.from('blp_stories').update({ status: 'rejected' }).eq('submission_id', submissionId);
      return res.status(200).json({ ok: true });
    }

    if (action === 'spam') {
      await supabaseAdmin.from('blp_submissions').update({ status: 'spam' }).eq('id', submissionId);
      return res.status(200).json({ ok: true });
    }

    if (action === 'approve-flagged') {
      if (submission.relevance_decision !== 'flag') {
        return res.status(400).json({ error: 'Submission is not in flagged state.' });
      }
      await buildStoryForFlaggedSubmission(submission);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unsupported action.' });
  } catch (error) {
    console.error('[BLP ADMIN MODERATE] Error:', error);
    return res.status(500).json({ error: 'Failed to update moderation state.' });
  }
}
