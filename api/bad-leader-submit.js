import { supabaseAdmin } from '../lib/supabase-admin.js';
import {
  classifyAliConditions,
  detectStoryTone,
  neutralizeStory,
  runRelevanceCheck,
  createEmbedding,
} from '../lib/badLeaderAi.js';

const MIN_STORY_CHARS = 1250;
const MAX_STORY_CHARS = 25000;

function validatePayload(body = {}) {
  const errors = {};
  if (!body.name || !String(body.name).trim()) errors.name = 'Name is required.';
  if (!body.email || !String(body.email).includes('@')) errors.email = 'A valid email is required.';
  if (!body.region || !String(body.region).trim()) errors.region = 'Region is required.';
  if (!body.industry || !String(body.industry).trim()) errors.industry = 'Industry is required.';
  const story = String(body.story || '');
  if (!story.trim()) errors.story = 'Story is required.';
  if (story.length < MIN_STORY_CHARS) errors.story = `Story must be at least ${MIN_STORY_CHARS} characters.`;
  if (story.length > MAX_STORY_CHARS) errors.story = `Story must be under ${MAX_STORY_CHARS} characters.`;
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body || {};
    const errors = validatePayload(payload);
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    const originalStory = String(payload.story || '').trim();
    const relevance = await runRelevanceCheck(originalStory);
    const relevanceDecision = relevance?.decision || 'flag';
    const relevanceReason = relevance?.reason || 'Submission requires review.';

    if (relevanceDecision === 'reject') {
      return res.status(422).json({
        error:
          'This submission does not match what the archive is looking for. If you believe this is an error, contact us directly.',
      });
    }

    if (relevanceDecision === 'flag') {
      const { data: flaggedSubmission, error: flaggedError } = await supabaseAdmin
        .from('blp_submissions')
        .insert({
          name: String(payload.name).trim(),
          email: String(payload.email).toLowerCase().trim(),
          region: String(payload.region).trim(),
          industry: String(payload.industry).trim(),
          original_story: originalStory,
          tone: 'dysfunctional',
          status: 'flagged',
          relevance_decision: 'flag',
          relevance_reason: relevanceReason,
        })
        .select('id')
        .single();
      if (flaggedError) throw flaggedError;
      return res.status(200).json({ ok: true, status: 'flagged', submissionId: flaggedSubmission.id });
    }

    const toneResult = await detectStoryTone(originalStory);
    const tone = toneResult?.tone === 'exemplary' ? 'exemplary' : 'dysfunctional';

    const neutralizedText = await neutralizeStory(originalStory);
    const classification = await classifyAliConditions(neutralizedText, tone);
    const conditions = Array.isArray(classification?.conditions)
      ? classification.conditions
          .map((c) => String(c).toLowerCase().trim())
          .filter((c) =>
            ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'drift'].includes(c)
          )
      : [];
    const scoreboardLeadership = tone === 'dysfunctional' ? Boolean(classification?.scoreboard_leadership) : false;
    const confidence = ['high', 'medium', 'low'].includes(classification?.confidence)
      ? classification.confidence
      : 'medium';

    const embedding = await createEmbedding(neutralizedText);
    const embeddingValue = embedding.length > 0 ? `[${embedding.join(',')}]` : null;

    const { data: submission, error: subError } = await supabaseAdmin
      .from('blp_submissions')
      .insert({
        name: String(payload.name).trim(),
        email: String(payload.email).toLowerCase().trim(),
        region: String(payload.region).trim(),
        industry: String(payload.industry).trim(),
        original_story: originalStory,
        tone,
        status: 'pending',
        relevance_decision: 'approve',
        relevance_reason: relevanceReason,
      })
      .select('id, region, industry')
      .single();
    if (subError) throw subError;

    const { data: story, error: storyError } = await supabaseAdmin
      .from('blp_stories')
      .insert({
        submission_id: submission.id,
        region: submission.region,
        industry: submission.industry,
        neutralized_text: neutralizedText,
        tone,
        ali_conditions: conditions,
        scoreboard_leadership: scoreboardLeadership,
        classification_confidence: confidence,
        embedding_vector: embeddingValue,
        status: 'pending',
      })
      .select('id')
      .single();
    if (storyError) throw storyError;

    await supabaseAdmin.from('blp_cluster_jobs').insert({
      story_id: story.id,
      status: 'queued',
    });

    return res.status(200).json({ ok: true, status: 'pending_review', submissionId: submission.id });
  } catch (error) {
    console.error('[BLP SUBMIT] Error:', error);
    return res.status(500).json({ error: 'Failed to process submission.' });
  }
}
