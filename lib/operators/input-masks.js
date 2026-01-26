/**
 * Input Masks for Operators Forms
 * 
 * Phone number and USD currency formatting utilities
 */

/**
 * Format phone number as user types (US format: (XXX) XXX-XXXX)
 */
export function formatPhoneNumber(value) {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Format USD currency as user types
 */
export function formatUSD(value) {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  if (digits === '') return '';
  
  // Convert to number and format with 2 decimal places
  const num = parseInt(digits, 10) / 100;
  return num.toFixed(2);
}

/**
 * Parse USD formatted string to number
 */
export function parseUSD(value) {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}
