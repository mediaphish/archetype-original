/**
 * ALI Cadence Calculation - Baseline-Anchored Survey Dates
 * 
 * Rules:
 * - S1 = baseline_date
 * - S2 = baseline_date + 3 months
 * - S3 = baseline_date + 6 months
 * - S4 = baseline_date + 9 months
 * - Month-end rule: If target month lacks baseline day, snap to last valid day
 * - Late sending does NOT shift future cadence
 */

/**
 * Add months to a date, handling month-end edge cases
 * 
 * @param {Date} date - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} New date with months added
 */
function addMonths(date, months) {
  // Clamp while adding, not afterwards.
  //
  // The previous version called setMonth(month + 3), so Jan 31 + 3 became
  // "April 31" and JavaScript rolled it forward to May 1. applyMonthEndRule
  // below then inspected MAY's last day (31), found 31 > 31 false, and passed
  // May 1 through untouched — a survey scheduled a month late for any baseline
  // on the 29th, 30th, or 31st.
  //
  // UTC throughout, because these are calendar days and the consumer
  // (getSurveyAvailableAt) already reads them with getUTC*. Local getters made
  // the result depend on server timezone: '2026-01-31' parses as UTC midnight,
  // which reads back as Jan 30 in US Central and Jan 31 in UTC — so the same
  // baseline produced different survey dates on different machines, and this
  // bug stayed hidden locally while being live on Vercel, which runs UTC.
  const targetMonthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  const result = new Date(date);
  result.setUTCFullYear(targetYear, targetMonth, Math.min(date.getUTCDate(), lastDayOfTarget));
  return result;
}

/**
 * Get the last day of a given month
 * 
 * @param {Date} date - Date in the target month
 * @returns {number} Last day of the month (28-31)
 */
function getLastDayOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/**
 * Apply month-end rule: If target month lacks baseline day, snap to last valid day
 * 
 * Example: baseline_date = Jan 31, target = Apr 30 (April only has 30 days)
 * 
 * @param {Date} targetDate - Calculated target date
 * @param {Date} baselineDate - Original baseline date
 * @returns {Date} Adjusted date with month-end rule applied
 */
function applyMonthEndRule(targetDate, baselineDate) {
  // addMonths already clamps, so this is now a backstop rather than the
  // mechanism. Kept — and made UTC-consistent — because it documents the rule
  // and catches any future caller that reaches it with an unclamped date.
  const baselineDay = baselineDate.getUTCDate();
  const targetLastDay = getLastDayOfMonth(targetDate);

  // If baseline day doesn't exist in target month, use last day
  if (baselineDay > targetLastDay) {
    const clamped = new Date(targetDate);
    clamped.setUTCFullYear(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetLastDay);
    return clamped;
  }

  return targetDate;
}

/**
 * Calculate survey date from baseline_date and survey_index
 * 
 * @param {Date|string} baselineDate - Baseline date (Date object or ISO string)
 * @param {string} surveyIndex - "S1", "S2", "S3", "S4"
 * @returns {Date} Calculated survey date
 */
export function calculateSurveyDate(baselineDate, surveyIndex) {
  // Parse baseline date if string
  const baseline = baselineDate instanceof Date 
    ? baselineDate 
    : new Date(baselineDate);
  
  if (isNaN(baseline.getTime())) {
    throw new Error(`Invalid baseline_date: ${baselineDate}`);
  }
  
  // Extract survey number (S1 -> 1, S2 -> 2, etc.)
  const surveyNumber = parseInt(surveyIndex.replace('S', ''));
  
  if (isNaN(surveyNumber) || surveyNumber < 1) {
    throw new Error(`Invalid survey_index: ${surveyIndex}`);
  }
  
  // S1 = baseline_date (no offset)
  if (surveyNumber === 1) {
    return new Date(baseline);
  }
  
  // S2+ = baseline_date + (surveyNumber - 1) * 3 months
  const monthsToAdd = (surveyNumber - 1) * 3;
  const targetDate = addMonths(baseline, monthsToAdd);
  
  // Apply month-end rule
  return applyMonthEndRule(targetDate, baseline);
}

/**
 * Calculate available_at timestamp for a survey
 * 
 * @param {Date|string} baselineDate - Baseline date
 * @param {string} surveyIndex - Survey index
 * @returns {Date} Available timestamp (start of day in UTC)
 */
export function calculateAvailableAt(baselineDate, surveyIndex) {
  const surveyDate = calculateSurveyDate(baselineDate, surveyIndex);
  
  // Return start of day in UTC
  const availableAt = new Date(Date.UTC(
    surveyDate.getUTCFullYear(),
    surveyDate.getUTCMonth(),
    surveyDate.getUTCDate(),
    0, 0, 0, 0
  ));
  
  return availableAt;
}

/**
 * Get next survey index for a company
 * 
 * @param {Array} existingSurveys - Array of existing survey snapshots
 * @returns {string} Next survey index ("S1", "S2", etc.)
 */
export function getNextSurveyIndex(existingSurveys) {
  if (!existingSurveys || existingSurveys.length === 0) {
    return 'S1';
  }
  
  // Extract survey numbers and find max
  const surveyNumbers = existingSurveys
    .map(s => {
      const match = s.survey_index?.match(/^S(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  if (surveyNumbers.length === 0) {
    return 'S1';
  }
  
  const maxSurveyNumber = Math.max(...surveyNumbers);
  const nextNumber = maxSurveyNumber + 1;
  
  return `S${nextNumber}`;
}

