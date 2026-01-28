/**
 * E2E tests for Operators Check-in workflow
 * 
 * Tests check-in functionality for Accountants:
 * - Viewing RSVP list
 * - Checking in attendees
 * - Marking no-shows
 * - Checking out (early departure)
 */

describe('Operators Check-in Workflow', () => {
  const testEmail = 'accountant@test.com';
  const testEventId = 'open-event-123';

  beforeEach(() => {
    cy.loginAsChiefOperator(testEmail);
    
    // Override to add accountant role
    cy.intercept('GET', `/api/operators/users/me?email=*`, {
      statusCode: 200,
      body: {
        ok: true,
        user: {
          email: testEmail,
          roles: ['operator', 'chief_operator', 'accountant'],
        },
      },
    });
  });

  it('should display check-in interface for Accountants', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Open Event',
          state: 'OPEN',
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: false },
            { user_email: 'user2@test.com', status: 'confirmed', checked_in: true },
          ],
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    cy.contains(/Check.*In|Check-In Management/i).should('be.visible');
  });

  it('should allow checking in an attendee', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'OPEN',
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: false },
          ],
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/check-in`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: true },
          ],
        },
      },
    }).as('checkInRequest');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Check In button
    cy.get('button[aria-label*="Check in"]').first().click();
    
    cy.wait('@checkInRequest');
    cy.contains(/success|checked in/i).should('be.visible');
  });

  it('should allow marking no-show', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'OPEN',
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: false },
          ],
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/check-in`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: false, marked_no_show: true },
          ],
        },
      },
    }).as('noShowRequest');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click No-Show button
    cy.get('button[aria-label*="No-Show"]').first().click();
    
    cy.wait('@noShowRequest');
    cy.contains(/success|no.*show/i).should('be.visible');
  });

  it('should allow checking out (early departure)', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'OPEN',
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: true },
          ],
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/check-in`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: false, checked_out: true },
          ],
        },
      },
    }).as('checkOutRequest');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Check Out button
    cy.get('button[aria-label*="Check out"]').first().click();
    
    cy.wait('@checkOutRequest');
    cy.contains(/success|checked out/i).should('be.visible');
  });
});
