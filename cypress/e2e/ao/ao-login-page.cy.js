/**
 * AO login page — smoke test: visit /ao/login and verify the page renders.
 * Run: CYPRESS_BASE_URL=https://www.archetypeoriginal.com npx cypress run --spec cypress/e2e/ao/ao-login-page.cy.js
 */
describe('AO login page', () => {
  it('loads /ao/login and shows AO sign-in UI', () => {
    cy.visit('/ao/login');
    cy.url().should('include', '/ao/login');
    // AO login page should show sign-in context (magic link, email, etc.)
    cy.get('body').then(($body) => {
      const text = $body.text();
      const hasAO = /AO|sign in|magic|email/i.test(text);
      expect(hasAO, 'page should show AO or sign-in related text').to.be.true;
    });
    // Should have a form or email input or button to send link
    cy.get('body').find('input[type="email"], button, form').should('exist');
  });
});
