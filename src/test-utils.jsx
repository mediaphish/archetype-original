/**
 * Shared test utilities for React Testing Library
 * Plan 3.1: "Set up testing utilities (src/test-utils.jsx)"
 */

import React from 'react';
import { render } from '@testing-library/react';

/**
 * Custom render that wraps with common providers (e.g. UserContext, ToastProvider).
 * Use for operators components that need context.
 */
function renderWithProviders(ui, { wrapper: Wrapper, ...options } = {}) {
  function DefaultWrapper({ children }) {
    return <>{children}</>;
  }
  const WrapperComponent = Wrapper || DefaultWrapper;
  return render(ui, {
    wrapper: WrapperComponent,
    ...options,
  });
}

export * from '@testing-library/react';
export { renderWithProviders };
