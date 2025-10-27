import React from 'react';

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`px-4 py-3 rounded-lg ${isUser ? 'bg-gray-100 border border-gray-300' : 'bg-gray-50 border border-gray-200'}`}>
          <p className="text-lg whitespace-pre-wrap text-gray-800 leading-relaxed">
            {message}
          </p>
        </div>
        
        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className="mt-3 space-y-2">
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className="block w-full text-left px-4 py-2 text-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors rounded-lg"
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