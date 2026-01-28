import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ToastProvider, { useToast } from '../ToastProvider';

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast();
  
  return (
    <div>
      <button onClick={() => toast.success('Success!')}>Show Success</button>
      <button onClick={() => toast.error('Error!')}>Show Error</button>
      <button onClick={() => toast.warning('Warning!')}>Show Warning</button>
      <button onClick={() => toast.info('Info!')}>Show Info</button>
    </div>
  );
}

describe('ToastProvider', () => {
  it('should provide toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    expect(screen.getByText('Show Success')).toBeInTheDocument();
  });

  it('should display toast when success is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    act(() => {
      screen.getByText('Show Success').click();
    });
    
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display error toast when error is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    act(() => {
      screen.getByText('Show Error').click();
    });
    
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('should throw error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within ToastProvider');
    
    console.error = originalError;
  });
});
