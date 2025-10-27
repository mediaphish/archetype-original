// src/app/components/MessageBubble.jsx
import React from 'react';

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-xs sm:max-w-md ${isUser ? 'text-right' : 'text-left'}`}>
        <p className={`text-base whitespace-pre-wrap ${isUser ? 'text-black' : 'text-black'}`}>
          {message}
        </p>
        
        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className="mt-4 space-y-2">
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className="block w-full text-left px-4 py-2 text-sm border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
              >
                {option.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}