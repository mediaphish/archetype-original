import React from 'react';

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-2`}>
      <div className={`max-w-[60%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`px-4 py-3 rounded-2xl ${isUser 
          ? 'bg-gray-800 text-white rounded-br-md' 
          : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
        }`}>
          <p className="text-lg whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>
        
        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className={`mt-3 space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className={`block px-4 py-2 text-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors rounded-lg ${
                  isUser ? 'text-right' : 'text-left'
                }`}
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