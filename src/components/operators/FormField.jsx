import React, { memo } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  success = false,
  required = false,
  placeholder,
  helpText,
  maxLength,
  rows,
  className = '',
  disabled = false,
  ...props
}) {
  const inputId = `field-${name}`;
  const hasError = !!error;
  const showSuccess = success && !hasError && (value || '').toString().trim().length > 0;

  const baseInputClasses = `
    w-full px-4 py-2 sm:py-3 text-base border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-colors
    ${hasError 
      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
      : showSuccess
        ? 'border-green-500 bg-green-50/30 focus:ring-green-500'
        : 'border-gray-300 bg-white'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
  `;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={inputId}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            rows={rows || 4}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          />
        );
      case 'select':
        return (
          <select
            id={inputId}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          >
            {props.children}
          </select>
        );
      default:
        return (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          />
        );
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-base font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderInput()}
      {maxLength && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {(value || '').length} / {maxLength} characters
        </div>
      )}
      {helpText && !hasError && (
        <p id={`${inputId}-help`} className="mt-1 text-base text-gray-500">
          {helpText}
        </p>
      )}
      {showSuccess && (
        <p className="mt-1 flex items-center gap-1 text-sm text-green-600" aria-hidden="true">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Looks good</span>
        </p>
      )}
      {hasError && (
        <div
          id={`${inputId}-error`}
          className="mt-1 flex items-center gap-1 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default memo(FormField);
