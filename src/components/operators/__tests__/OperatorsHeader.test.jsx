/**
 * Unit tests for OperatorsHeader
 * Plan 3.1: "OperatorsHeader.test.jsx"
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import OperatorsHeader from '../OperatorsHeader';

const mockLogout = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({
    email: 'test@example.com',
    userRoles: ['operator'],
    logout: mockLogout,
  }),
}));

describe('OperatorsHeader', () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockNavigate.mockClear();
  });

  it('renders the logo', () => {
    render(<OperatorsHeader active="events" onNavigate={mockNavigate} />);
    const logo = document.querySelector('img[alt="The Operators"]');
    expect(logo).toBeInTheDocument();
  });

  it('renders desktop nav links', () => {
    render(<OperatorsHeader active="events" onNavigate={mockNavigate} />);
    expect(screen.getByLabelText('Navigate to Events')).toBeInTheDocument();
    expect(screen.getByLabelText('Navigate to Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Navigate to Profile')).toBeInTheDocument();
  });

  it('renders skip link', () => {
    render(<OperatorsHeader active="events" onNavigate={mockNavigate} />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders mobile menu button', () => {
    render(<OperatorsHeader active="events" onNavigate={mockNavigate} />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});
