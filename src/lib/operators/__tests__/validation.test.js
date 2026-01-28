import {
  validateEmail,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateURL,
  validateFile,
  validateProfileForm,
  validateEventForm,
} from '../validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('text')).toBe(true);
      expect(validateRequired('0')).toBe(true);
      expect(validateRequired(0)).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
      expect(validateRequired('   ')).toBe(false);
    });
  });

  describe('validateMinLength', () => {
    it('should validate strings meeting minimum length', () => {
      expect(validateMinLength('hello', 3)).toBe(true);
      expect(validateMinLength('test', 4)).toBe(true);
    });

    it('should reject strings below minimum length', () => {
      expect(validateMinLength('hi', 3)).toBe(false);
      expect(validateMinLength('', 1)).toBe(false);
    });
  });

  describe('validateMaxLength', () => {
    it('should validate strings within maximum length', () => {
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('test', 4)).toBe(true);
    });

    it('should reject strings exceeding maximum length', () => {
      expect(validateMaxLength('hello world', 5)).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should validate correct URLs', () => {
      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://example.com')).toBe(true);
      expect(validateURL('https://www.example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('example.com')).toBe(false);
      expect(validateURL('')).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate files within size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateFile(file, {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        fieldName: 'Test'
      });

      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }); // 3MB

      const result = validateFile(file, {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg'],
        fieldName: 'Test'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('should reject files with disallowed types', () => {
      const file = new File(['content'], 'test.gif', { type: 'image/gif' });

      const result = validateFile(file, {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        fieldName: 'Test'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('type');
    });
  });

  describe('validateProfileForm', () => {
    it('should validate complete profile form', () => {
      const formData = {
        role_title: 'CEO',
        industry: 'Technology',
        bio: 'This is a bio with enough words to pass validation',
        business_name: 'Test Company',
        website_url: 'https://example.com'
      };

      const result = validateProfileForm(formData);
      expect(result.valid).toBe(true);
    });

    it('should reject profile form with missing required fields', () => {
      const formData = {
        role_title: '',
        industry: 'Technology',
      };

      const result = validateProfileForm(formData);
      expect(result.valid).toBe(false);
      expect(result.errors.role_title).toBeDefined();
    });

    it('should reject profile form with invalid URL', () => {
      const formData = {
        role_title: 'CEO',
        industry: 'Technology',
        bio: 'Valid bio',
        website_url: 'not-a-url'
      };

      const result = validateProfileForm(formData);
      expect(result.valid).toBe(false);
      expect(result.errors.website_url).toBeDefined();
    });
  });
});
