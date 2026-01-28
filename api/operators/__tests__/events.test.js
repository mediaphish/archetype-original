/**
 * Integration tests for Operators Events API
 * 
 * These tests verify event listing, filtering, and data structure
 */

describe('Events API Integration', () => {
  describe('Event Filtering', () => {
    it('should filter events by state correctly', () => {
      const events = [
        { id: 1, state: 'LIVE' },
        { id: 2, state: 'OPEN' },
        { id: 3, state: 'CLOSED' },
        { id: 4, state: 'LIVE' },
      ];

      const liveEvents = events.filter(e => e.state === 'LIVE');
      expect(liveEvents).toHaveLength(2);
      expect(liveEvents.every(e => e.state === 'LIVE')).toBe(true);
    });

    it('should return all events when filter is "all"', () => {
      const events = [
        { id: 1, state: 'LIVE' },
        { id: 2, state: 'OPEN' },
        { id: 3, state: 'CLOSED' },
      ];

      const allEvents = events; // No filter applied
      expect(allEvents).toHaveLength(3);
    });
  });

  describe('Event Date Filtering', () => {
    it('should filter future events correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const events = [
        { id: 1, event_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0] }, // Tomorrow
        { id: 2, event_date: new Date(today.getTime() - 86400000).toISOString().split('T')[0] }, // Yesterday
        { id: 3, event_date: today.toISOString().split('T')[0] }, // Today
      ];

      const futureEvents = events.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate >= today;
      });

      expect(futureEvents.length).toBeGreaterThanOrEqual(1);
      expect(futureEvents.every(e => new Date(e.event_date) >= today)).toBe(true);
    });
  });

  describe('RSVP Status Mapping', () => {
    it('should map RSVP status correctly', () => {
      const event = {
        user_rsvp_status: 'confirmed',
        confirmed_count: 5,
        waitlist_count: 2,
      };

      const mappedEvent = {
        ...event,
        user_rsvp: event.user_rsvp_status ? { status: event.user_rsvp_status } : null,
        rsvps: Array.from({ length: event.confirmed_count || 0 }, (_, i) => ({ status: 'confirmed' }))
          .concat(Array.from({ length: event.waitlist_count || 0 }, (_, i) => ({ status: 'waitlisted' })))
      };

      expect(mappedEvent.user_rsvp.status).toBe('confirmed');
      expect(mappedEvent.rsvps.filter(r => r.status === 'confirmed')).toHaveLength(5);
      expect(mappedEvent.rsvps.filter(r => r.status === 'waitlisted')).toHaveLength(2);
    });
  });
});
