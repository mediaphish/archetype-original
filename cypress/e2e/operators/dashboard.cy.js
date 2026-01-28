/**
 * E2E tests for Operators Dashboard
 * 
 * Tests dashboard functionality:
 * - Loading dashboard metrics
 * - Displaying event metrics
 * - Displaying longitudinal metrics
 * - Showing upcoming events
 */

describe('Operators Dashboard', () => {
  const testEmail = 'operator@test.com';

  beforeEach(() => {
    cy.loginAsOperator(testEmail);
  });

  it('should load and display dashboard metrics', () => {
    cy.intercept('GET', '/api/operators/dashboard', {
      statusCode: 200,
      body: {
        ok: true,
        dashboard: {
          event_metrics: {
            total_events: 10,
            live_events: 3,
            open_events: 2,
            closed_events: 5,
            seats_filled_rate: 75.5,
            voting_completion_rate: 80.0,
            total_pot: 1200.00,
          },
          longitudinal_metrics: {
            active_operators: 25,
            repeat_attendance_count: 15,
            promotion_rate: 20.0,
          },
        },
      },
    }).as('dashboardRequest');

    cy.intercept('GET', '/api/operators/events?state=LIVE*', {
      statusCode: 200,
      body: {
        ok: true,
        events: [],
      },
    });

    cy.visitOperators('/dashboard', testEmail);
    cy.waitForOperatorsPage();
    
    cy.wait('@dashboardRequest');
    
    // Verify metrics are displayed
    cy.contains('10').should('be.visible'); // Total events
    cy.contains('3').should('be.visible'); // Live events
    cy.contains('75.5%').should('be.visible'); // Seats filled rate
  });

  it('should display empty state when no dashboard data', () => {
    cy.intercept('GET', '/api/operators/dashboard', {
      statusCode: 200,
      body: {
        ok: false,
        error: 'No data available',
      },
    });

    cy.visitOperators('/dashboard', testEmail);
    cy.waitForOperatorsPage();

    cy.contains(/No data available|Unable to load/i).should('be.visible');
    cy.contains('button', 'Retry').should('be.visible');
  });

  it('should display upcoming events section', () => {
    cy.intercept('GET', '/api/operators/dashboard', {
      statusCode: 200,
      body: {
        ok: true,
        dashboard: {
          event_metrics: {
            total_events: 5,
            live_events: 2,
            open_events: 1,
            closed_events: 2,
            seats_filled_rate: 60.0,
            voting_completion_rate: 70.0,
            total_pot: 600.00,
          },
          longitudinal_metrics: {
            active_operators: 10,
            repeat_attendance_count: 5,
            promotion_rate: 15.0,
          },
        },
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    cy.intercept('GET', '/api/operators/events?state=LIVE*', {
      statusCode: 200,
      body: {
        ok: true,
        events: [
          {
            id: 'event-1',
            title: 'Upcoming Event',
            event_date: futureDate,
            state: 'LIVE',
            max_seats: 20,
            confirmed_count: 10,
          },
        ],
      },
    });

    cy.visitOperators('/dashboard', testEmail);
    cy.waitForOperatorsPage();

    cy.contains('Upcoming Events').should('be.visible');
    cy.contains('Upcoming Event').should('be.visible');
  });
});
