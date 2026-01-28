import {
  handleKeyDown,
  getVoteAriaLabel,
  getCheckInAriaLabel,
  getRSVPAriaLabel,
  trapFocus,
  announceToScreenReader,
} from '../accessibility';

describe('accessibility utilities', () => {
  describe('handleKeyDown', () => {
    it('should call callback on Enter key', () => {
      const callback = jest.fn();
      const handler = handleKeyDown(callback);
      const event = { key: 'Enter', preventDefault: jest.fn() };

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should call callback on Space key', () => {
      const callback = jest.fn();
      const handler = handleKeyDown(callback);
      const event = { key: ' ', preventDefault: jest.fn() };

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should not call callback on other keys', () => {
      const callback = jest.fn();
      const handler = handleKeyDown(callback);
      const event = { key: 'Tab', preventDefault: jest.fn() };

      handler(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getVoteAriaLabel', () => {
    it('should generate correct upvote label', () => {
      const label = getVoteAriaLabel('user@example.com', 1, null);
      expect(label).toBe('upvote user@example.com');
    });

    it('should generate correct downvote label', () => {
      const label = getVoteAriaLabel('user@example.com', -1, null);
      expect(label).toBe('downvote user@example.com');
    });

    it('should indicate when vote is currently selected', () => {
      const label = getVoteAriaLabel('user@example.com', 1, 1);
      expect(label).toBe('upvote user@example.com (currently selected)');
    });
  });

  describe('getCheckInAriaLabel', () => {
    it('should generate check-in label for unchecked user', () => {
      const label = getCheckInAriaLabel('user@example.com', false);
      expect(label).toBe('Check in user@example.com');
    });

    it('should generate check-out label for checked-in user', () => {
      const label = getCheckInAriaLabel('user@example.com', true);
      expect(label).toBe('Check out user@example.com (early departure)');
    });
  });

  describe('getRSVPAriaLabel', () => {
    it('should generate RSVP label when user has not RSVPed', () => {
      const label = getRSVPAriaLabel('Test Event', false);
      expect(label).toBe('RSVP for Test Event');
    });

    it('should generate cancel RSVP label when user has RSVPed', () => {
      const label = getRSVPAriaLabel('Test Event', true);
      expect(label).toBe('Cancel RSVP for Test Event');
    });
  });

  describe('trapFocus', () => {
    it('should focus first element and set up tab trapping', () => {
      const element = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      element.appendChild(button1);
      element.appendChild(button2);

      const cleanup = trapFocus(element);

      expect(document.activeElement).toBe(button1);
      expect(cleanup).toBeInstanceOf(Function);

      cleanup();
    });

    it('should return undefined if element is null', () => {
      const result = trapFocus(null);
      expect(result).toBeUndefined();
    });
  });

  describe('announceToScreenReader', () => {
    it('should create and remove announcement element', (done) => {
      const initialBodyChildren = document.body.children.length;
      
      announceToScreenReader('Test announcement');

      setTimeout(() => {
        expect(document.body.children.length).toBe(initialBodyChildren);
        done();
      }, 1100);
    });
  });
});
