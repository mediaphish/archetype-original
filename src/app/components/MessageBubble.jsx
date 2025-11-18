import React from 'react';

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-2`}>
      <div className={`max-w-[60%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`px-4 py-3 rounded-2xl ${isUser 
          ? 'bg-amber text-white rounded-br-md' 
          : 'bg-warm-offWhiteAlt text-warm-charcoal rounded-bl-md border border-warm-border'
        }`}>
          <p className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed" style={{ lineHeight: '1.6' }}>
            {message}
          </p>
        </div>
        
        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className={`mt-3 space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className={`block w-full px-4 py-2 text-base border border-warm-border bg-warm-offWhite text-warm-charcoal hover:bg-warm-offWhiteAlt hover:border-amber transition-all duration-300 rounded-lg min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 ${
                  isUser ? 'text-right' : 'text-left'
                }`}
                aria-label={option.text}
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