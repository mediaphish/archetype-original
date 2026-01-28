/**
 * E2E tests for Operators Voting workflow
 * 
 * Tests voting functionality during OPEN events:
 * - Viewing attendees list
 * - Upvoting and downvoting
 * - Vote limits enforcement
 * - Vote status display
 */

describe('Operators Voting Workflow', () => {
  const testEmail = 'operator@test.com';
  const testEventId = 'open-event-123';

  beforeEach(() => {
    cy.loginAsOperator(testEmail);
  });

  it('should display voting interface for OPEN events', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Open Event',
          state: 'OPEN',
          rsvps: [
            { user_email: 'user1@test.com', status: 'confirmed', checked_in: true },
            { user_email: 'user2@test.com', status: 'confirmed', checked_in: true },
          ],
          vote_summary: {
            'user1@test.com': { upvotes: 5, downvotes: 1 },
            'user2@test.com': { upvotes: 3, downvotes: 0 },
          },
          remaining_votes: 10,
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    cy.contains(/Voting|Remaining Votes/i).should('be.visible');
    cy.contains('10').should('be.visible'); // Remaining votes
  });

  it('should allow upvoting an attendee', () => {
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
          remaining_votes: 10,
        },
      },
    });

    cy.intercept('POST', `/api/operators/events/${testEventId}/votes`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          remaining_votes: 9,
        },
      },
    }).as('voteRequest');

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Find and click upvote button (thumbs up)
    cy.get('button[aria-label*="upvote"]').first().click();
    
    cy.wait('@voteRequest');
    cy.contains(/success|vote/i).should('be.visible');
  });

  it('should enforce vote limit', () => {
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
          remaining_votes: 0, // No votes remaining
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Vote buttons should be disabled
    cy.get('button[aria-label*="upvote"]').should('be.disabled');
  });

  it('should display vote counts correctly', () => {
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
          vote_summary: {
            'user1@test.com': { upvotes: 5, downvotes: 1 },
          },
        },
      },
    });

    cy.visitOperators(`/events/${testEventId}`, testEmail);
    cy.waitForOperatorsPage();

    // Should show vote counts
    cy.contains('5').should('be.visible'); // Upvotes
    cy.contains('1').should('be.visible'); // Downvotes
  });
});
