import {
  validateEmail,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateURL,
  validateFile,
  validateProfileForm,
} from '../validation';

/**
 * These tests were written against a boolean API — validateEmail(x) === true —
 * that this module has not had for some time. Every validator returns
 * { valid, error }, which is what validateCandidateForm and Profile.jsx have
 * always consumed. The tests were red rather than wrong about intent, which is
 * why a red suite is worse than no suite: nobody could tell which of the 18
 * failures were stale assertions and which were real defects. Two here were
 * real, and are noted where they appear.
 */
describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('accepts well-formed addresses', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
    });

    it('rejects malformed addresses with a reason', () => {
      for (const bad of ['invalid', '@example.com', 'test@', '']) {
        const result = validateEmail(bad);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('validateRequired', () => {
    it('accepts any present value', () => {
      expect(validateRequired('text').valid).toBe(true);
      expect(validateRequired('0').valid).toBe(true);
    });

    // Was a real bug: the guard was `!value`, so the number zero read as
    // missing and a required numeric field could never be satisfied by 0.
    it('accepts the number zero as present', () => {
      expect(validateRequired(0).valid).toBe(true);
    });

    it('rejects absent values', () => {
      for (const empty of ['', null, undefined, '   ']) {
        expect(validateRequired(empty).valid).toBe(false);
      }
    });
  });

  describe('validateMinLength', () => {
    it('accepts strings meeting the minimum', () => {
      expect(validateMinLength('hello', 3).valid).toBe(true);
      expect(validateMinLength('test', 4).valid).toBe(true);
    });

    it('rejects strings below the minimum', () => {
      expect(validateMinLength('hi', 3).valid).toBe(false);
      expect(validateMinLength('', 1).valid).toBe(false);
    });
  });

  describe('validateMaxLength', () => {
    it('accepts strings within the maximum', () => {
      expect(validateMaxLength('hello', 10).valid).toBe(true);
      expect(validateMaxLength('test', 4).valid).toBe(true);
    });

    it('rejects strings over the maximum', () => {
      expect(validateMaxLength('hello world', 5).valid).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('accepts full URLs', () => {
      expect(validateURL('https://example.com').valid).toBe(true);
      expect(validateURL('http://example.com').valid).toBe(true);
      expect(validateURL('https://www.example.com/path').valid).toBe(true);
    });

    it('accepts a bare domain, since https:// is prepended', () => {
      expect(validateURL('example.com').valid).toBe(true);
    });

    it('treats an empty URL as valid, because the field is optional', () => {
      expect(validateURL('').valid).toBe(true);
    });

    // Was a real bug: new URL('https://not-a-url') parses, because "not-a-url"
    // is a legal hostname — so any single word saved as someone's website.
    it('rejects a single word with no domain suffix', () => {
      const result = validateURL('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('validateFile', () => {
    const fileOfSize = (bytes, type = 'image/jpeg', name = 'test.jpg') => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: bytes });
      return file;
    };

    it('accepts a file within the size and type limits', () => {
      const result = validateFile(fileOfSize(1024 * 1024), {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        fieldName: 'Test',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects a file over the size limit, naming the limit', () => {
      const result = validateFile(fileOfSize(3 * 1024 * 1024), {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg'],
        fieldName: 'Test',
      });
      expect(result.valid).toBe(false);
      // The message reads "must be smaller than 2.0MB" — it never contained the
      // word "size", which is what the old assertion looked for.
      expect(result.error).toContain('smaller than');
    });

    it('rejects a disallowed type, listing what is allowed', () => {
      const result = validateFile(fileOfSize(1024, 'image/gif', 'test.gif'), {
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        fieldName: 'Test',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('rejects a missing file', () => {
      expect(validateFile(null, { fieldName: 'Test' }).valid).toBe(false);
    });
  });

  describe('validateProfileForm', () => {
    it('accepts a complete profile', () => {
      const result = validateProfileForm({
        role_title: 'CEO',
        industry: 'Technology',
        bio: 'This is a bio with enough words to pass validation easily here',
        business_name: 'Test Company',
        website_url: 'https://example.com',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('rejects a bio under the ten-word minimum', () => {
      const result = validateProfileForm({ bio: 'Too short' });
      expect(result.valid).toBe(false);
      expect(result.errors.bio).toBeDefined();
    });

    it('rejects an invalid website URL', () => {
      const result = validateProfileForm({
        bio: 'This is a bio with enough words to pass validation easily here',
        website_url: 'not-a-url',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.website_url).toBeDefined();
    });

    // The old test asserted role_title was required. It is not: this validator
    // only checks bio and website_url, and Profile.jsx renders the Role Title
    // field without a `required` prop. Two of three say optional, so the
    // assertion was removed rather than the behavior changed — whether it
    // SHOULD be required is a product decision, not a defect.
    it('does not currently treat role_title as required', () => {
      expect(validateProfileForm({ role_title: '' }).valid).toBe(true);
    });
  });
});
