import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField component', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnBlur.mockClear();
  });

  it('should render text input field', () => {
    render(
      <FormField
        label="Test Field"
        name="test"
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  it('should render textarea field', () => {
    render(
      <FormField
        label="Description"
        name="description"
        type="textarea"
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA');
  });

  it('should display error message when error prop is provided', () => {
    render(
      <FormField
        label="Test"
        name="test"
        value=""
        onChange={mockOnChange}
        error="This field is required"
      />
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display help text when provided', () => {
    render(
      <FormField
        label="Test"
        name="test"
        value=""
        onChange={mockOnChange}
        helpText="This is helpful information"
      />
    );
    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
  });

  it('should call onChange when input value changes', () => {
    render(
      <FormField
        label="Test"
        name="test"
        value=""
        onChange={mockOnChange}
      />
    );
    const input = screen.getByLabelText('Test');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should call onBlur when input loses focus', () => {
    render(
      <FormField
        label="Test"
        name="test"
        value=""
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    );
    const input = screen.getByLabelText('Test');
    fireEvent.blur(input);
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('should display character count when maxLength is provided', () => {
    render(
      <FormField
        label="Test"
        name="test"
        value="hello"
        onChange={mockOnChange}
        maxLength={100}
      />
    );
    expect(screen.getByText(/5 \/ 100 characters/)).toBeInTheDocument();
  });

  it('should mark field as required when required prop is true', () => {
    render(
      <FormField
        label="Required Field"
        name="required"
        value=""
        onChange={mockOnChange}
        required
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
