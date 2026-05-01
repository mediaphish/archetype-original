/**
 * ALI Narrative Submit
 *
 * Accepts a tenant-private narrative submission tied to a deployment but
 * NOT tied to any respondent identity. Lightly de-identifies the text,
 * applies a length cap, and stores the result for moderation.
 *
 * POST /api/ali/narrative/submit
 * Body: {
 *   deploymentToken: string (required),
 *   triggerType: 'dissonance' | 'systemic' (required),
 *   condition?: string,                         // required when triggerType='dissonance'
 *   text: string (required, 1..4000 chars after de-id),
 *   language?: string                            // default 'en'
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   narrative: { id, moderation_status: 'pending', is_visible: false }
 * }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

const MAX_LENGTH = 4000;
const MIN_LENGTH = 8;

const VALID_CONDITIONS = new Set([
  'clarity',
  'consistency',
  'trust',
  'communication',
  'alignment',
  'stability',
  'leadership_drift',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { deploymentToken, triggerType, condition, text, language } = req.body || {};

    if (!deploymentToken) {
      return res.status(400).json({ ok: false, error: 'deploymentToken is required' });
    }
    if (!triggerType || !['dissonance', 'systemic'].includes(triggerType)) {
      return res.status(400).json({ ok: false, error: 'triggerType must be dissonance or systemic' });
    }
    if (triggerType === 'dissonance') {
      if (!condition || !VALID_CONDITIONS.has(condition)) {
        return res.status(400).json({ ok: false, error: 'condition is required for dissonance triggers' });
      }
    }
    if (typeof text !== 'string' || text.trim().length < MIN_LENGTH) {
      return res.status(400).json({ ok: false, error: `text must be at least ${MIN_LENGTH} characters` });
    }

    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select('id, company_id, status')
      .eq('deployment_token', deploymentToken)
      .single();

    if (deploymentError || !deployment) {
      return res.status(404).json({ ok: false, error: 'Survey deployment not found' });
    }

    if (deployment.status === 'archived') {
      return res.status(400).json({ ok: false, error: 'This survey is archived' });
    }

    const cleanedText = lightlyDeidentify(text).slice(0, MAX_LENGTH).trim();
    if (cleanedText.length < MIN_LENGTH) {
      return res.status(400).json({ ok: false, error: 'After de-identification, the text was too short' });
    }

    const readingGrade = fleschKincaidGrade(cleanedText);

    const insertRow = {
      tenant_id: deployment.company_id,
      deployment_id: deployment.id,
      trigger_type: triggerType,
      condition: triggerType === 'dissonance' ? condition : null,
      text: cleanedText,
      language: typeof language === 'string' && language.trim() ? language.trim() : 'en',
      reading_grade: typeof readingGrade === 'number' ? Number(readingGrade.toFixed(2)) : null,
      moderation_status: 'pending',
      is_visible: false,
    };

    const { data: narrative, error: insertError } = await supabaseAdmin
      .from('ali_narratives')
      .insert(insertRow)
      .select('id, moderation_status, is_visible')
      .single();

    if (insertError) {
      console.error('[ali/narrative/submit] insert error:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to store narrative' });
    }

    await supabaseAdmin.from('ali_narrative_audit').insert({
      narrative_id: narrative.id,
      action: 'created',
      actor: 'system',
      notes: `trigger=${triggerType}${condition ? ` condition=${condition}` : ''}`,
    });

    return res.status(201).json({
      ok: true,
      narrative: {
        id: narrative.id,
        moderation_status: narrative.moderation_status,
        is_visible: narrative.is_visible,
      },
    });
  } catch (err) {
    console.error('[ali/narrative/submit] error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/**
 * Lightweight de-identification pass. Targets emails, phone numbers, and the
 * "Hi, I'm Bart" / "My name is Bart" self-name patterns that respondents are
 * most likely to volunteer in a narrative. We do not rewrite or neutralize
 * the story — the plan is explicit about that.
 */
function lightlyDeidentify(text) {
  let out = String(text || '');

  out = out.replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '[email removed]');
  out = out.replace(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone removed]');

  out = out.replace(/(\bmy name is\b\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, '$1[name removed]');
  out = out.replace(/(\bhi,?\s+i'?m\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, '$1[name removed]');
  out = out.replace(/(\bi am\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b)(?=,)/g, '$1[name removed]');

  return out;
}

function fleschKincaidGrade(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return null;
  const sentences = Math.max(1, (cleaned.match(/[.!?]+/g) || []).length);
  const words = cleaned.split(/\s+/).filter(Boolean).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return null;
  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  stripped = stripped.replace(/^y/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}
