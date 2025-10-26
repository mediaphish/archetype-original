// src/app/components/MessageBubble.jsx
import React from 'react';

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs sm:max-w-md px-4 py-3 rounded-xl ${
          isUser
            ? 'bg-black text-white'
            : 'bg-white border border-slate-200 text-slate-800'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
        
        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className="mt-3 space-y-2">
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className="w-full text-left px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors duration-200"
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
