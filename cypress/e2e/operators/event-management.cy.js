/**
 * E2E tests for Operators Event Management workflow
 * 
 * Tests event state transitions and management:
 * - Creating events
 * - Starting events (LIVE → OPEN)
 * - Closing events (OPEN → CLOSED)
 * - Reopening events (CLOSED → OPEN)
 * - Reverting to LIVE
 */

describe('Operators Event Management Workflow', () => {
  const testEmail = 'chief@test.com';
  const testEventId = 'test-event-123';

  beforeEach(() => {
    cy.loginAsChiefOperator(testEmail);
  });

  it('should allow Chief Operator to start an event', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Event',
          state: 'LIVE',
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/open`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'OPEN',
        },
      },
    }).as('openEvent');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Start Event button
    cy.contains('button', /Start Event/i).should('be.visible').click();
    
    // Confirm in modal
    cy.contains('button', 'Confirm').click();
    
    cy.wait('@openEvent');
    cy.contains(/success|started/i).should('be.visible');
  });

  it('should allow closing an event', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Event',
          state: 'OPEN',
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/close`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'CLOSED',
        },
      },
    }).as('closeEvent');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Close Event button
    cy.contains('button', /Close Event/i).should('be.visible').click();
    
    // Confirm in modal
    cy.contains('button', 'Confirm').click();
    
    cy.wait('@closeEvent');
    cy.contains(/success|closed/i).should('be.visible');
  });

  it('should display ROI winner after closing event', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Event',
          state: 'CLOSED',
          roi_winner: {
            winner_email: 'winner@test.com',
            pot_amount_won: 560.00,
          },
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    cy.contains(/ROI|Winner/i).should('be.visible');
    cy.contains('560').should('be.visible');
  });

  it('should allow reopening a closed event', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Event',
          state: 'CLOSED',
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/reopen`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'OPEN',
        },
      },
    }).as('reopenEvent');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Reopen Event button
    cy.contains('button', /Reopen Event/i).should('be.visible').click();
    
    // Confirm in modal
    cy.contains('button', 'Confirm').click();
    
    cy.wait('@reopenEvent');
    cy.contains(/success|reopened/i).should('be.visible');
  });

  it('should allow reverting OPEN event back to LIVE', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Test Event',
          state: 'OPEN',
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/revert-to-live`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          state: 'LIVE',
        },
      },
    }).as('revertToLive');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Click Revert to LIVE button
    cy.contains('button', /Revert.*LIVE|Back to LIVE/i).should('be.visible').click();
    
    // Confirm in modal
    cy.contains('button', 'Confirm').click();
    
    cy.wait('@revertToLive');
    cy.contains(/success|reverted/i).should('be.visible');
  });
});
