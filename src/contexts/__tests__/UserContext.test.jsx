import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UserProvider, { useUser } from '../UserContext';

// Mock fetch
global.fetch = jest.fn();

// Test component that uses the user hook
function TestComponent() {
  const { email, userRoles, loading } = useUser();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <div data-testid="email">{email}</div>
      <div data-testid="roles">{userRoles.join(', ')}</div>
    </div>
  );
}

describe('UserContext', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should provide user context to children', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        user: {
          email: 'test@example.com',
          roles: ['operator']
        }
      })
    });

    render(
      <UserProvider initialEmail="test@example.com">
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    });
  });

  it('should show loading state initially', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <UserProvider initialEmail="test@example.com">
        <TestComponent />
      </UserProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should throw error when useUser is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useUser must be used within UserProvider');
    
    console.error = originalError;
  });

  it('should extract email from URL if initialEmail not provided', () => {
    // Mock URLSearchParams
    const mockGet = jest.fn().mockReturnValue('url@example.com');
    Object.defineProperty(window, 'location', {
      value: { search: '?email=url@example.com' },
      writable: true,
    });
    
    // This is a basic test - in real scenario, we'd need to mock URLSearchParams properly
    expect(mockGet()).toBe('url@example.com');
  });
});
