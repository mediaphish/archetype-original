// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/**
 * Navigate to Operators page with email parameter
 */
Cypress.Commands.add('visitOperators', (path = '', email = 'test@example.com') => {
  const url = `/operators${path}?email=${encodeURIComponent(email)}`;
  cy.visit(url);
});

/**
 * Mock API response for Operators endpoints
 */
Cypress.Commands.add('mockOperatorsAPI', (endpoint, method = 'GET', response) => {
  cy.intercept(method, `/api/operators${endpoint}`, {
    statusCode: 200,
    body: response,
  }).as(`operators${endpoint.replace(/\//g, '-')}`);
});

/**
 * Login as Operator user (mock)
 */
Cypress.Commands.add('loginAsOperator', (email = 'operator@test.com') => {
  cy.window().then((win) => {
    win.localStorage.setItem('operators_email', email);
  });
  
  // Mock user data API
  cy.intercept('GET', `/api/operators/users/me?email=*`, {
    statusCode: 200,
    body: {
      ok: true,
      user: {
        email: email,
        roles: ['operator'],
      },
    },
  });
});

/**
 * Login as Chief Operator (mock)
 */
Cypress.Commands.add('loginAsChiefOperator', (email = 'chief@test.com') => {
  cy.window().then((win) => {
    win.localStorage.setItem('operators_email', email);
  });
  
  cy.intercept('GET', `/api/operators/users/me?email=*`, {
    statusCode: 200,
    body: {
      ok: true,
      user: {
        email: email,
        roles: ['operator', 'chief_operator'],
      },
    },
  });
});

/**
 * Login as Super Admin (mock)
 */
Cypress.Commands.add('loginAsSuperAdmin', (email = 'admin@test.com') => {
  cy.window().then((win) => {
    win.localStorage.setItem('operators_email', email);
  });
  
  cy.intercept('GET', `/api/operators/users/me?email=*`, {
    statusCode: 200,
    body: {
      ok: true,
      user: {
        email: email,
        roles: ['operator', 'chief_operator', 'super_admin'],
      },
    },
  });
});

/**
 * Wait for Operators page to load
 */
Cypress.Commands.add('waitForOperatorsPage', () => {
  cy.get('header').should('be.visible');
  cy.get('header').should('contain', 'Operators');
});
