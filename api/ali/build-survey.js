/**
 * ALI Survey Builder API Endpoint
 * 
 * Generates deterministic, immutable survey snapshots
 * 
 * POST /api/ali/build-survey
 * Body: {
 *   clientId: string (required) - Company UUID
 *   surveyIndex: string (required) - "S1", "S2", "S3", etc.
 *   instrumentVersion?: string (default: "v1.0")
 * }
 * 
 * Returns: {
 *   snapshot: {
 *     id: UUID
 *     survey_index: "S1"
 *     question_stable_ids: ["Q-CLARITY-001", ...]
 *     question_order: [...]
 *     generation_seed: "..."
 *   }
 * }
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import {
  generateSeed,
  buildSurvey,
  validateSurveyComposition
} from '../../lib/ali-survey-builder.js';

// In-memory cache for question bank (refreshed periodically)
let questionBankCache = null;
let questionBankCacheTimestamp = null;
const QUESTION_BANK_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Load question bank from database (with caching)
 */
async function loadQuestionBank(instrumentVersion = 'v1.0') {
  const now = Date.now();
  
  // Return cached if still valid
  if (questionBankCache && 
      questionBankCacheTimestamp && 
      (now - questionBankCacheTimestamp) < QUESTION_BANK_CACHE_TTL) {
    return questionBankCache.filter(q => q.instrument_version === instrumentVersion);
  }
  
  // Load from database
  const { data: questions, error } = await supabaseAdmin
    .from('ali_question_bank')
    .select('*')
    .eq('status', 'active')
    .order('stable_id');
  
  if (error) {
    console.error('Error loading question bank:', error);
    throw new Error('Failed to load question bank');
  }
  
  if (!questions || questions.length === 0) {
    throw new Error('Question bank is empty. No active questions found.');
  }
  
  // Update cache
  questionBankCache = questions;
  questionBankCacheTimestamp = now;
  
  return questions.filter(q => q.instrument_version === instrumentVersion);
}

/**
 * Check if survey snapshot already exists
 */
async function getExistingSnapshot(clientId, surveyIndex, instrumentVersion) {
  const { data: snapshot } = await supabaseAdmin
    .from('ali_survey_snapshots')
    .select('*')
    .eq('client_id', clientId)
    .eq('survey_index', surveyIndex)
    .eq('instrument_version', instrumentVersion)
    .single();
  
  return snapshot;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const {
      clientId,
      surveyIndex,
      instrumentVersion = 'v1.0'
    } = req.body || {};
    
    // Validation
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    if (!surveyIndex || !/^S\d+$/.test(surveyIndex)) {
      return res.status(400).json({ 
        error: 'surveyIndex is required and must match pattern S1, S2, S3, etc.' 
      });
    }
    
    // Verify client exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, baseline_date')
      .eq('id', clientId)
      .single();
    
    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check for existing snapshot (don't regenerate)
    const existing = await getExistingSnapshot(clientId, surveyIndex, instrumentVersion);
    if (existing) {
      return res.status(200).json({
        success: true,
        snapshot: existing,
        message: 'Survey snapshot already exists (immutable)'
      });
    }
    
    // Load question bank
    let questionBank;
    try {
      questionBank = await loadQuestionBank(instrumentVersion);
    } catch (error) {
      console.error('Error loading question bank:', error);
      return res.status(500).json({ 
        error: 'Failed to load question bank',
        details: error.message
      });
    }
    
    if (questionBank.length === 0) {
      return res.status(500).json({ 
        error: `No active questions found for instrument version: ${instrumentVersion}`
      });
    }
    
    // Generate survey
    let surveyResult;
    try {
      surveyResult = buildSurvey(questionBank, clientId, surveyIndex, instrumentVersion);
    } catch (error) {
      console.error('Error building survey:', error);
      return res.status(500).json({ 
        error: 'Failed to build survey',
        details: error.message
      });
    }
    
    // Final validation (defensive)
    const finalValidation = validateSurveyComposition(surveyResult.questions);
    if (!finalValidation.isValid) {
      return res.status(500).json({
        error: 'Survey composition validation failed',
        details: finalValidation.errors
      });
    }
    
    // Prepare question metadata for snapshot
    const questionStableIds = surveyResult.questions.map(q => q.stable_id);
    const questionOrder = surveyResult.questions.map((q, index) => ({
      order: index + 1,
      stable_id: q.stable_id,
      question_text: q.question_text,
      pattern: q.pattern,
      role: q.role,
      angle: q.angle,
      lens: q.lens,
      is_negative: q.is_negative,
      is_anchor: q.is_anchor
    }));
    
    // Generate seed
    const generationSeed = generateSeed(clientId, surveyIndex, instrumentVersion);
    
    // Create snapshot in database
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('ali_survey_snapshots')
      .insert({
        client_id: clientId,
        survey_index: surveyIndex,
        instrument_version: instrumentVersion,
        generation_seed: generationSeed,
        generated_by: 'system',
        question_stable_ids: questionStableIds,
        question_order: questionOrder,
        anchor_count: finalValidation.composition.anchorCount,
        pattern_question_count: finalValidation.composition.patternCount,
        total_question_count: finalValidation.composition.totalCount,
        negative_item_count: finalValidation.composition.negativeCount,
        is_locked: true
      })
      .select()
      .single();
    
    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      
      // Check if it's a unique constraint violation (race condition)
      if (snapshotError.code === '23505') {
        // Snapshot was created by another request, fetch it
        const existing = await getExistingSnapshot(clientId, surveyIndex, instrumentVersion);
        if (existing) {
          return res.status(200).json({
            success: true,
            snapshot: existing,
            message: 'Survey snapshot created by concurrent request'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Failed to create survey snapshot',
        details: snapshotError.message
      });
    }
    
    // Log generation (for audit)
    console.log(`[ALI] Survey generated: ${clientId} ${surveyIndex} ${instrumentVersion} (seed: ${generationSeed.substring(0, 8)}...)`);
    
    return res.status(201).json({
      success: true,
      snapshot: {
        id: snapshot.id,
        client_id: snapshot.client_id,
        survey_index: snapshot.survey_index,
        instrument_version: snapshot.instrument_version,
        generation_seed: snapshot.generation_seed,
        question_stable_ids: snapshot.question_stable_ids,
        question_order: snapshot.question_order,
        anchor_count: snapshot.anchor_count,
        pattern_question_count: snapshot.pattern_question_count,
        total_question_count: snapshot.total_question_count,
        negative_item_count: snapshot.negative_item_count,
        generated_at: snapshot.generated_at,
        generated_by: snapshot.generated_by
      },
      message: 'Survey snapshot created successfully'
    });
    
  } catch (err) {
    console.error('Server error in build-survey:', err);
    return res.status(500).json({ 
      error: 'Server error. Please try again.',
      details: err.message
    });
  }
}

