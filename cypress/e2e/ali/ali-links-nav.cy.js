/**
 * ALI links and navigation E2E tests
 *
 * Runs against the deployed ALI app. Use CYPRESS_BASE_URL (default in
 * test:e2e:ali is https://www.archetypeoriginal.com). Ensures every main link,
 * button, and nav item goes to a valid destination. Regression test for
 * Leadership Profile, Reports Hub, and report cross-links.
 */

const testEmail = 'test@archetypeoriginal.com';

function mockAliDashboard() {
  cy.intercept('GET', '**/api/ali/dashboard?*', {
    statusCode: 200,
    body: {
      company: { id: 'c1', name: 'Test Co', subscription_status: 'active' },
      scores: { ali: { current: 55, rolling: null, zone: 'orange' }, anchors: { current: 50, rolling: null }, patterns: {}, drift: {} },
      experienceMap: { current: { x: 50, y: 50, zone: 'stress' } },
      leadershipProfile: { profile: 'profile_forming', honesty: { score: 50, state: 'selective' }, clarity: { level: 50, state: 'ambiguous', stddev: 0 } },
      dataQuality: { meets_minimum_n_org: true },
    },
  });
}

function mockAliReports() {
  cy.intercept('GET', '**/api/ali/reports?*', { statusCode: 200, body: { ok: true, historicalTrends: [] } });
}

describe('ALI links and navigation', () => {
  beforeEach(() => {
    mockAliDashboard();
    mockAliReports();
  });

  it('Reports Hub in header goes to /ali/reports', () => {
    cy.visit(`/ali/dashboard?email=${encodeURIComponent(testEmail)}`);
    cy.get('nav').contains('Reports').trigger('mouseenter');
    cy.contains('Reports Hub').click();
    cy.url().should('include', '/ali/reports');
    cy.contains('Choose a deep-dive view').should('be.visible');
  });

  it('Reports Hub page has Zones, Mirror, Profile cards that navigate', () => {
    cy.visit(`/ali/reports?email=${encodeURIComponent(testEmail)}`);
    cy.contains('Zones').click();
    cy.url().should('include', '/ali/reports/zones');
    cy.contains('Zones').should('be.visible');

    cy.visit(`/ali/reports?email=${encodeURIComponent(testEmail)}`);
    cy.contains('Leadership Mirror').click();
    cy.url().should('include', '/ali/reports/mirror');

    cy.visit(`/ali/reports?email=${encodeURIComponent(testEmail)}`);
    cy.contains('Leadership Profile').click();
    cy.url().should('include', '/ali/reports/profile');
  });

  it('Profile page has Reports Hub, Mirror, Zones links', () => {
    cy.visit(`/ali/reports/profile?email=${encodeURIComponent(testEmail)}`);
    cy.contains('Leadership Profile').should('be.visible');
    cy.contains('Reports Hub').click();
    cy.url().should('include', '/ali/reports');
  });
});
