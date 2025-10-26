// src/app/components/EscalationButton.jsx
import React, { useState } from 'react';

export default function EscalationButton({ onEscalate }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      await onEscalate();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <button
        onClick={handleEscalate}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
      >
        {isLoading ? 'Processing...' : 'Request Live Handoff'}
      </button>
    </div>
  );
}
