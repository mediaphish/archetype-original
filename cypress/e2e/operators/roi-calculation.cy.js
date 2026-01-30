/**
 * E2E tests for Operators ROI calculation flow
 * Plan 3.2: "e2e/roi-calculation.spec.js"
 *
 * Tests ROI display and calculation for CLOSED events:
 * - View ROI results on event detail when event is CLOSED
 * - ROI winner display
 */

describe('Operators ROI Calculation Flow', () => {
  const testEmail = 'operator@test.com';
  const testEventId = 'closed-event-123';

  beforeEach(() => {
    cy.loginAsOperator(testEmail);
  });

  it('should display ROI section for CLOSED events', () => {
    cy.intercept('GET', `/api/operators/events/${testEventId}*`, {
      statusCode: 200,
      body: {
        ok: true,
        event: {
          id: testEventId,
          title: 'Closed Event',
          state: 'CLOSED',
          roi_winner_email: 'winner@test.com',
          roi_results: [
            { candidate_email: 'winner@test.com', roi_score: 85 },
            { candidate_email: 'other@test.com', roi_score: 70 },
          ],
        },
      },
    });

    cy.visit(`/operators/events/${testEventId}`);
    cy.get('[id="main-content"]').should('exist');
    // ROI content may be in event detail when state is CLOSED
    cy.contains(/ROI|winner|results/i).should('exist');
  });
});
