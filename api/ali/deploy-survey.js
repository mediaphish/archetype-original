/**
 * ALI Survey Deployment (Updated)
 * 
 * Creates survey deployment using system-generated survey snapshots
 * 
 * POST /api/ali/deploy-survey
 * Body: {
 *   companyId: string (required)
 *   surveyIndex?: string (optional - auto-calculated if not provided)
 *   divisionId?: string (null = company-wide)
 *   instrumentVersion?: string (default: "v1.0")
 *   opensAt?: string (ISO timestamp - when company chooses to open)
 *   closesAt?: string (ISO timestamp - optional closing date)
 *   minimumResponses?: number (default: 5)
 * }
 * 
 * Note: surveyId is deprecated. System now generates surveys deterministically.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { randomBytes } from 'crypto';
import { calculateAvailableAt, getNextSurveyIndex } from '../../lib/ali-cadence.js';
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

function generateDeploymentToken() {
  // Generate a secure, URL-safe token
  return randomBytes(32).toString('base64url');
}

/**
 * Get or create survey snapshot
 */
async function getOrCreateSnapshot(companyId, surveyIndex, instrumentVersion) {
  // Check for existing snapshot
  const { data: existing } = await supabaseAdmin
    .from('ali_survey_snapshots')
    .select('*')
    .eq('client_id', companyId)
    .eq('survey_index', surveyIndex)
    .eq('instrument_version', instrumentVersion)
    .single();
  
  if (existing) {
    return existing;
  }
  
  // Generate new snapshot using builder logic directly
  const questionBank = await loadQuestionBank(instrumentVersion);
  const surveyResult = buildSurvey(questionBank, companyId, surveyIndex, instrumentVersion);
  
  // Final validation
  const finalValidation = validateSurveyComposition(surveyResult.questions);
  if (!finalValidation.isValid) {
    throw new Error(`Survey composition validation failed: ${finalValidation.errors.join('; ')}`);
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
  const generationSeed = generateSeed(companyId, surveyIndex, instrumentVersion);
  
  // Create snapshot in database
  const { data: snapshot, error: snapshotError } = await supabaseAdmin
    .from('ali_survey_snapshots')
    .insert({
      client_id: companyId,
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
    // Check if it's a unique constraint violation (race condition)
    if (snapshotError.code === '23505') {
      // Snapshot was created by another request, fetch it
      const { data: raceSnapshot } = await supabaseAdmin
        .from('ali_survey_snapshots')
        .select('*')
        .eq('client_id', companyId)
        .eq('survey_index', surveyIndex)
        .eq('instrument_version', instrumentVersion)
        .single();
      
      if (raceSnapshot) {
        return raceSnapshot;
      }
    }
    
    throw new Error(`Failed to create survey snapshot: ${snapshotError.message}`);
  }
  
  return snapshot;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      companyId,
      surveyIndex, // Optional - will be calculated if not provided
      divisionId,
      instrumentVersion = 'v1.0',
      opensAt,
      closesAt,
      minimumResponses = 5
    } = req.body || {};

    // Validation
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from('ali_companies')
      .select('id, name, baseline_date')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Determine survey index
    let finalSurveyIndex = surveyIndex;
    if (!finalSurveyIndex) {
      // Get existing surveys for this company
      const { data: existingSurveys } = await supabaseAdmin
        .from('ali_survey_snapshots')
        .select('survey_index')
        .eq('client_id', companyId)
        .eq('instrument_version', instrumentVersion);
      
      finalSurveyIndex = getNextSurveyIndex(existingSurveys || []);
    } else {
      // Validate survey index format
      if (!/^S\d+$/.test(finalSurveyIndex)) {
        return res.status(400).json({ 
          error: 'surveyIndex must match pattern S1, S2, S3, etc.' 
        });
      }
    }

    // For S1, ensure baseline_date is set
    if (finalSurveyIndex === 'S1' && !company.baseline_date) {
      // Set baseline_date to today if not set
      const today = new Date().toISOString().split('T')[0];
      const { error: updateError } = await supabaseAdmin
        .from('ali_companies')
        .update({ baseline_date: today })
        .eq('id', companyId);
      
      if (updateError) {
        console.error('Error setting baseline_date:', updateError);
        return res.status(500).json({ 
          error: 'Failed to set baseline_date',
          details: updateError.message
        });
      }
      
      // Refresh company data to get updated baseline_date
      const { data: updatedCompany, error: refreshError } = await supabaseAdmin
        .from('ali_companies')
        .select('id, name, baseline_date')
        .eq('id', companyId)
        .single();
      
      if (refreshError || !updatedCompany) {
        console.error('Error refreshing company data:', refreshError);
        return res.status(500).json({ 
          error: 'Failed to refresh company data',
          details: refreshError?.message
        });
      }
      
      company.baseline_date = updatedCompany.baseline_date;
    }

    // If division specified, verify it exists and belongs to company
    if (divisionId) {
      const { data: division } = await supabaseAdmin
        .from('ali_divisions')
        .select('id, company_id, name, status')
        .eq('id', divisionId)
        .single();

      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }

      if (division.company_id !== companyId) {
        return res.status(400).json({ error: 'Division does not belong to this company' });
      }

      if (division.status !== 'active') {
        return res.status(400).json({ error: 'Division is not active' });
      }
    }

    // Get or create survey snapshot
    let snapshot;
    try {
      snapshot = await getOrCreateSnapshot(companyId, finalSurveyIndex, instrumentVersion);
    } catch (error) {
      console.error('Error getting/creating snapshot:', error);
      return res.status(500).json({ 
        error: 'Failed to get or create survey snapshot',
        details: error.message
      });
    }

    if (!snapshot) {
      return res.status(500).json({ error: 'Failed to create survey snapshot' });
    }

    // Calculate available_at from baseline_date and survey_index
    let availableAt = opensAt ? new Date(opensAt) : null;
    if (!availableAt) {
      if (company.baseline_date) {
        availableAt = calculateAvailableAt(company.baseline_date, finalSurveyIndex);
      } else {
        // Fallback: use current date for S1 if baseline_date is still not set
        availableAt = new Date();
        availableAt.setUTCHours(0, 0, 0, 0);
      }
    }

    // Generate unique deployment token
    let deploymentToken;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      deploymentToken = generateDeploymentToken();
      const { data: existing } = await supabaseAdmin
        .from('ali_survey_deployments')
        .select('id')
        .eq('deployment_token', deploymentToken)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique deployment token' });
    }

    // Create deployment
    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from('ali_survey_deployments')
      .insert({
        snapshot_id: snapshot.id,
        survey_id: null, // Deprecated, but keep for backward compatibility
        company_id: companyId,
        division_id: divisionId || null,
        survey_index: finalSurveyIndex,
        deployment_token: deploymentToken,
        status: availableAt && availableAt > new Date() ? 'pending' : 'active',
        opens_at: opensAt ? new Date(opensAt) : null,
        available_at: availableAt,
        closes_at: closesAt ? new Date(closesAt) : null,
        minimum_responses: minimumResponses
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment:', deploymentError);
      return res.status(500).json({ 
        error: 'Failed to create survey deployment',
        details: deploymentError.message,
        code: deploymentError.code,
        hint: deploymentError.hint
      });
    }

    // Build survey URL
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';
    const surveyUrl = `${siteUrl}/ali/survey/${deploymentToken}`;

    return res.status(201).json({
      success: true,
      deployment: {
        id: deployment.id,
        snapshotId: deployment.snapshot_id,
        surveyIndex: deployment.survey_index,
        companyId: deployment.company_id,
        divisionId: deployment.division_id,
        status: deployment.status,
        opensAt: deployment.opens_at,
        availableAt: deployment.available_at,
        closesAt: deployment.closes_at,
        minimumResponses: deployment.minimum_responses,
        surveyUrl
      },
      snapshot: {
        id: snapshot.id,
        surveyIndex: snapshot.survey_index,
        questionCount: snapshot.total_question_count
      },
      message: 'Survey deployment created successfully'
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
