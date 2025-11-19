/**
 * Floating Archy Chat Button
 * 
 * v0 Design: Fixed bottom-right, pulse animation on hover
 */
import React, { useState } from 'react';
import ChatApp from '../app/ChatApp';

export default function FloatingArchyButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-50 w-16 h-16 md:w-20 md:h-20 rounded-full bg-archy-orange shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
        aria-label="Chat with Archy"
      >
        <img
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-12 h-12 md:w-16 md:h-16 rounded-full relative z-10"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        {/* Fallback if image doesn't load */}
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl z-10">
          A
        </div>
        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-archy-orange opacity-75 animate-ping"></span>
      </button>

      {/* Chat Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-md h-[600px] pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <img
                      src="/images/archy-avatar.png"
                      alt="Archy"
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-archy-orange rounded-full text-white font-bold text-sm">
                      A
                    </div>
                  </div>
                  <span className="font-semibold text-charcoal">Archy</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-warm-grey hover:text-charcoal transition-colors text-2xl leading-none"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </div>
              
              {/* Chat App */}
              <div className="flex-1 overflow-hidden">
                <ChatApp />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

