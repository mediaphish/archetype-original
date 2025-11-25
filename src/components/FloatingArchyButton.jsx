/**
 * Floating Archy Chat Button
 * 
 * Fixed bottom-right, opens chat overlay with context-aware messaging
 */
import React, { useState, useEffect } from 'react';
import ChatApp from '../app/ChatApp';

export default function FloatingArchyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState('default');

  // Detect current page context from URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') {
      setContext('home');
    } else if (path.includes('/journal')) {
      setContext('journal');
    } else if (path.includes('/mentoring') || path.includes('/consulting') || path.includes('/speaking') || path.includes('/fractional')) {
      setContext('mentoring');
    } else if (path.includes('/culture-science') || path.includes('/ali')) {
      setContext('culture-science');
    } else if (path.includes('/archy')) {
      setContext('archy');
    } else if (path.includes('/philosophy')) {
      setContext('philosophy');
    } else if (path.includes('/about')) {
      setContext('about');
    } else {
      setContext('default');
    }
  }, []);

  return (
    <>
      {/* Floating Button - Fixed position, stays visible while scrolling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-[9999] w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#C85A3C] shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
        style={{ position: 'fixed' }}
        aria-label="Chat with Archy"
      >
        <img
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-12 h-12 md:w-16 md:h-16 rounded-full relative z-10 border-0"
        />
        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-[#C85A3C] opacity-75 animate-ping"></span>
      </button>

      {/* Chat Overlay - Opens when button is clicked */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-md h-[85vh] max-h-[700px] pointer-events-auto flex flex-col">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <img
                      src="/images/archy-avatar.png"
                      alt="Archy"
                      className="w-10 h-10 rounded-full border-0"
                    />
                  </div>
                  <span className="font-semibold text-[#2B2D2F]">Archy</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#6B6B6B] hover:text-[#2B2D2F] transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </div>
              
              {/* Chat App - Context-aware based on current page */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatApp context={context} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
