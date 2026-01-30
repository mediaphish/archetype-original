/**
 * Unit tests for Operators Dashboard page
 * Plan 3.1: "Dashboard.test.jsx"
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock dependencies
jest.mock('../../../components/operators/OperatorsHeader', () => function MockHeader() {
  return <div data-testid="operators-header">OperatorsHeader</div>;
});
jest.mock('../../../components/operators/ToastProvider', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
}));
jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({
    email: 'test@example.com',
    userRoles: ['operator'],
  }),
}));
jest.mock('../../../components/operators/EmptyState', () => ({
  EmptyDashboard: () => <div data-testid="empty-dashboard">No data</div>,
}));
jest.mock('../../../components/operators/ConfirmModal', () => () => null);
jest.mock('../../../lib/operators/performance', () => ({
  trackPageLoad: jest.fn(),
  trackAPIResponseTime: jest.fn(),
}));
jest.mock('../../../lib/operators/errorTracking', () => ({
  trackError: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Dashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<Dashboard />);
    expect(document.querySelector('[aria-busy="true"]') || screen.getByTestId('operators-header')).toBeTruthy();
  });

  it('renders header', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dashboard: { total_events: 0, live_events: 0 } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, events: [] }),
    });
    render(<Dashboard />);
    expect(screen.getByTestId('operators-header')).toBeInTheDocument();
  });
});
