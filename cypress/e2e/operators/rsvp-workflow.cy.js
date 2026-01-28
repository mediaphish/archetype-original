/**
 * E2E tests for Operators RSVP workflow
 * 
 * Tests the complete RSVP flow:
 * - Viewing events
 * - RSVPing to an event
 * - Viewing RSVP status
 * - Canceling RSVP
 */

describe('Operators RSVP Workflow', () => {
  const testEmail = 'operator@test.com';
  const testEventId = 'test-event-123';

  beforeEach(() => {
    cy.loginAsOperator(testEmail);
    
    // Mock events list
    cy.mockOperatorsAPI('/events', 'GET', {
      ok: true,
      events: [
        {
          id: testEventId,
          title: 'Test Operators Meeting',
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          start_time: '18:00',
          finish_time: '21:00',
          state: 'LIVE',
          max_seats: 20,
          stake_amount: 120,
          confirmed_count: 5,
          waitlist_count: 2,
          user_rsvp_status: null,
        },
      ],
    });
  });

  it('should display events list', () => {
    cy.visitOperators('/events', testEmail);
    cy.waitForOperatorsPage();
    
    cy.contains('Events').should('be.visible');
    cy.contains('Test Operators Meeting').should('be.visible');
  });

  it('should allow RSVP to an event', () => {
    // Mock event detail
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Operators Meeting',
          state: 'LIVE',
          user_rsvp_status: null,
        },
      },
    });

    // Mock RSVP API
    cy.intercept('POST', `/api/operators/events/${testEventId}/rsvp`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          user_rsvp_status: 'confirmed',
        },
      },
    }).as('rsvpRequest');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click RSVP button
    cy.contains('button', 'RSVP').should('be.visible').click();
    
    cy.wait('@rsvpRequest');
    
    // Verify success (toast should appear)
    cy.contains(/success|RSVP/i).should('be.visible');
  });

  it('should display RSVP status after RSVPing', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Operators Meeting',
          state: 'LIVE',
          user_rsvp_status: 'confirmed',
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    cy.contains(/RSVP.*confirmed/i).should('be.visible');
  });

  it('should allow canceling RSVP', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Operators Meeting',
          state: 'LIVE',
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          start_time: '18:00',
          user_rsvp_status: 'confirmed',
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/rsvp`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          user_rsvp_status: null,
        },
      },
    }).as('cancelRSVP');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Cancel RSVP button
    cy.contains('button', /Cancel RSVP/i).should('be.visible').click();
    
    // Confirm in modal
    cy.contains('button', 'Confirm').click();
    
    cy.wait('@cancelRSVP');
    cy.contains(/cancel|success/i).should('be.visible');
  });
});
