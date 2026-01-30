import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';

const CriticalErrorContext = createContext(null);

export const useCriticalError = () => {
  const context = useContext(CriticalErrorContext);
  if (!context) {
    throw new Error('useCriticalError must be used within CriticalErrorProvider');
  }
  return context;
};

export function CriticalErrorProvider({ children }) {
  const [error, setError] = useState(null);

  const setCriticalError = useCallback((message) => {
    setError(message);
  }, []);

  const clearCriticalError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <CriticalErrorContext.Provider value={{ error, setCriticalError, clearCriticalError }}>
      {children}
      {error && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearCriticalError}
            className="flex-shrink-0 p-1 rounded hover:bg-red-700 transition-colors"
            aria-label="Dismiss critical error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </CriticalErrorContext.Provider>
  );
}

export default CriticalErrorProvider;
