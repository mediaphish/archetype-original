/**
 * ALI Survey Questions Fetch
 * 
 * Get survey questions for a deployment token
 * 
 * GET /api/ali/survey/[token]
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find deployment by token
    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .select(`
        id,
        survey_index,
        snapshot_id,
        status,
        opens_at,
        closes_at,
        company_id
      `)
      .eq('deployment_token', token)
      .single();

    if (deploymentError || !deployment) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Check if deployment is open
    if (deployment.status === 'closed' || deployment.status === 'archived') {
      return res.status(400).json({ error: 'This survey is no longer accepting responses' });
    }

    // Check if deployment has opened yet
    if (deployment.opens_at) {
      const opensAt = new Date(deployment.opens_at);
      if (new Date() < opensAt) {
        return res.status(400).json({ error: 'This survey is not yet open' });
      }
    }

    // Check if deployment has closed
    if (deployment.closes_at) {
      const closesAt = new Date(deployment.closes_at);
      if (new Date() > closesAt) {
        return res.status(400).json({ error: 'This survey has closed' });
      }
    }

    // Get survey snapshot with questions
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('ali_survey_snapshots')
      .select('question_stable_ids, question_order')
      .eq('id', deployment.snapshot_id)
      .single();

    if (snapshotError || !snapshot) {
      return res.status(500).json({ error: 'Failed to load survey questions' });
    }

    // Prefer serving immutable question wording from the snapshot itself.
    // This ensures editing the question bank later does NOT change already-issued survey links.
    const snapshotOrder = snapshot.question_order;

    const isObjectArray =
      Array.isArray(snapshotOrder) &&
      snapshotOrder.length > 0 &&
      typeof snapshotOrder[0] === 'object' &&
      snapshotOrder[0] !== null &&
      Object.prototype.hasOwnProperty.call(snapshotOrder[0], 'stable_id');

    let orderedQuestions = [];

    if (isObjectArray) {
      // New format: question_order is an array of objects with question_text captured at generation time
      orderedQuestions = snapshotOrder
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((q, idx) => ({
          id: q.stable_id,
          question_text: q.question_text,
          pattern: q.pattern,
          is_negative: !!q.is_negative,
          is_anchor: !!q.is_anchor,
          order: q.order ?? (idx + 1)
        }))
        .filter(q => !!q.id && !!q.question_text);
    } else {
      // Back-compat: if snapshots were stored with question_order as stable_id[] (older data),
      // fetch question text from the bank and order by that stable_id list.
      const stableIdList = Array.isArray(snapshotOrder) && snapshotOrder.length > 0
        ? snapshotOrder
        : snapshot.question_stable_ids;

      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('ali_question_bank')
        .select('stable_id, question_text, pattern, is_negative, is_anchor')
        .in('stable_id', stableIdList);

      if (questionsError || !questions) {
        return res.status(500).json({ error: 'Failed to load question details' });
      }

      orderedQuestions = stableIdList
        .map((stableId, index) => {
          const question = questions.find(q => q.stable_id === stableId);
          if (!question) return null;
          return {
            id: question.stable_id,
            question_text: question.question_text,
            pattern: question.pattern,
            is_negative: question.is_negative,
            is_anchor: question.is_anchor,
            order: index + 1
          };
        })
        .filter(Boolean);
    }

    // Defensive check: if snapshot has stable_ids, ensure we didn't drop anything unexpectedly
    if (Array.isArray(snapshot.question_stable_ids) && orderedQuestions.length !== snapshot.question_stable_ids.length) {
      console.error('Question count mismatch:', {
        expected: snapshot.question_stable_ids.length,
        found: orderedQuestions.length,
        deployment_id: deployment.id,
        snapshot_id: deployment.snapshot_id
      });
      return res.status(500).json({ error: 'Survey configuration error' });
    }

    return res.status(200).json({
      survey_index: deployment.survey_index,
      deployment_id: deployment.id,
      questions: orderedQuestions,
      closes_at: deployment.closes_at
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

