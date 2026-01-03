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
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the last day of a given month
 * 
 * @param {Date} date - Date in the target month
 * @returns {number} Last day of the month (28-31)
 */
function getLastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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
  const baselineDay = baselineDate.getDate();
  const targetLastDay = getLastDayOfMonth(targetDate);
  
  // If baseline day doesn't exist in target month, use last day
  if (baselineDay > targetLastDay) {
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetLastDay);
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

