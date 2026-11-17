/**
 * ALI links and navigation E2E tests
 *
 * Runs against the deployed ALI app. Use CYPRESS_BASE_URL (default in
 * test:e2e:ali is https://www.archetypeoriginal.com). The main screen is
 * Results (/ali/dashboard); Send survey is /ali/deploy. The old report pages
 * (/ali/reports, /zones, /mirror, /profile) redirect to Results.
 */

const testEmail = 'test@archetypeoriginal.com';

function mockAliResults() {
  cy.intercept('GET', '**/api/ali/results*', {
    statusCode: 200,
    body: { ok: true, round: null, rounds: [], ready: false, reason: 'no_rounds', teamResponses: 0, needed: 5 },
  });
}

describe('ALI links and navigation', () => {
  beforeEach(() => {
    mockAliResults();
  });

  it('header shows Results and Send survey, with no old report links', () => {
    cy.visit(`/ali/dashboard?email=${encodeURIComponent(testEmail)}`);
    cy.get('nav').contains('Results').should('exist');
    cy.get('nav').contains('Send survey').click();
    cy.url().should('include', '/ali/deploy');
    cy.contains('Reports Hub').should('not.exist');
  });

  ['/ali/reports', '/ali/reports/zones', '/ali/reports/mirror', '/ali/reports/profile'].forEach((path) => {
    it(`${path} redirects to Results`, () => {
      cy.visit(`${path}?email=${encodeURIComponent(testEmail)}`);
      cy.location('pathname').should('eq', '/ali/dashboard');
    });
  });
});
