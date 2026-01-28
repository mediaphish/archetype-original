/**
 * Client-side validation utilities for Operators platform
 */

export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validateMinLength = (value, minLength, fieldName = 'This field') => {
  if (!value || value.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { valid: true };
};

export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
  if (value && value.length > maxLength) {
    return { valid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }
  return { valid: true };
};

export const validateURL = (url) => {
  if (!url) {
    return { valid: true }; // URL is optional
  }
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
};

export const validateDate = (dateString, fieldName = 'Date') => {
  if (!dateString) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  return { valid: true };
};

export const validateTime = (timeString, fieldName = 'Time') => {
  if (!timeString) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) {
    return { valid: false, error: `Please enter a valid ${fieldName.toLowerCase()} (HH:MM format)` };
  }
  return { valid: true };
};

export const validateNumber = (value, min = null, max = null, fieldName = 'This field') => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (min !== null && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  if (max !== null && num > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max}` };
  }
  return { valid: true };
};

export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = [],
    fieldName = 'File'
  } = options;

  if (!file) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `${fieldName} must be smaller than ${maxSizeMB}MB` };
  }

  return { valid: true };
};

export const validateBio = (bio) => {
  if (!bio) {
    return { valid: true }; // Bio is optional
  }
  const wordCount = bio.trim().split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 10) {
    return { valid: false, error: 'Bio should be at least 10 words (recommended: 100-200 words)' };
  }
  if (bio.length > 2000) {
    return { valid: false, error: 'Bio must be no more than 2000 characters' };
  }
  return { valid: true };
};

/**
 * Validate event form data
 */
export const validateEventForm = (formData) => {
  const errors = {};

  // Title
  const titleValidation = validateRequired(formData.title, 'Event title');
  if (!titleValidation.valid) errors.title = titleValidation.error;

  // Date
  const dateValidation = validateDate(formData.event_date, 'Event date');
  if (!dateValidation.valid) errors.event_date = dateValidation.error;

  // Time
  const timeValidation = validateTime(formData.start_time, 'Start time');
  if (!timeValidation.valid) errors.start_time = timeValidation.error;

  // Location
  const locationValidation = validateRequired(formData.location, 'Location');
  if (!locationValidation.valid) errors.location = locationValidation.error;

  // Capacity
  const capacityValidation = validateNumber(formData.capacity, 1, 1000, 'Capacity');
  if (!capacityValidation.valid) errors.capacity = capacityValidation.error;

  // Stake amount
  if (formData.stake_amount) {
    const stakeValidation = validateNumber(formData.stake_amount, 0, null, 'Stake amount');
    if (!stakeValidation.valid) errors.stake_amount = stakeValidation.error;
  }

  // Sponsor pot
  if (formData.sponsor_pot_value) {
    const sponsorValidation = validateNumber(formData.sponsor_pot_value, 0, null, 'Sponsor pot');
    if (!sponsorValidation.valid) errors.sponsor_pot_value = sponsorValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate profile form data
 */
export const validateProfileForm = (formData) => {
  const errors = {};

  // Bio validation
  const bioValidation = validateBio(formData.bio);
  if (!bioValidation.valid) errors.bio = bioValidation.error;

  // Website URL validation
  if (formData.website_url) {
    const urlValidation = validateURL(formData.website_url);
    if (!urlValidation.valid) errors.website_url = urlValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate candidate submission form
 */
export const validateCandidateForm = (formData) => {
  const errors = {};

  // Email
  const emailValidation = validateEmail(formData.candidate_email);
  if (!emailValidation.valid) errors.candidate_email = emailValidation.error;

  // Essay
  const essayValidation = validateRequired(formData.essay, 'Essay');
  if (!essayValidation.valid) {
    errors.essay = essayValidation.error;
  } else {
    const essayLengthValidation = validateMinLength(formData.essay, 50, 'Essay');
    if (!essayLengthValidation.valid) errors.essay = essayLengthValidation.error;
  }

  // Contact info
  const contactValidation = validateRequired(formData.contact_info, 'Contact information');
  if (!contactValidation.valid) errors.contact_info = contactValidation.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};
