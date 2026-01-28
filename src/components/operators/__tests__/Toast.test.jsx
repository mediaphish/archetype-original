import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast component', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('should render success toast', () => {
    render(<Toast id="1" message="Success message" type="success" onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render error toast', () => {
    render(<Toast id="2" message="Error message" type="error" onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    render(<Toast id="3" message="Test message" type="info" onDismiss={mockOnDismiss} />);
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledWith('3');
  });

  it('should have correct ARIA attributes', () => {
    render(<Toast id="4" message="Test" type="warning" onDismiss={mockOnDismiss} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
