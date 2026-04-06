/**
 * Meet Archy Section
 * Editorial Minimal Design - 2-column layout with chat preview
 */
import React, { useState } from 'react';
import ChatApp from '../../app/ChatApp';
import { OptimizedImage } from '../OptimizedImage';

export default function MeetArchy() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setInitialMessage(inputValue.trim());
      setIsChatOpen(true);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <>
      <section id="archy" className="py-8 sm:py-10 md:py-12 lg:py-14 bg-white">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            {/* Badge */}
            <div className="inline-block mb-4 sm:mb-5">
              <span className="inline-block px-3 py-1 border border-[#1A1A1A]/10 text-xs font-medium tracking-wider text-[#C85A3C] uppercase">
                Your AI Guide
              </span>
            </div>

            {/* Header */}
            <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-4 sm:mb-5 md:mb-6 leading-tight tracking-tight break-words">
              Meet Archy
            </h2>
            
            {/* 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-start">
              {/* Left Column: Content */}
              <div className="order-2 lg:order-1">
                <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6 md:mb-7">
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 break-words">
                    Archy is a digital extension of how I think about people, culture, and leadership. He's grounded in lived experience, sharpened by research, and aligned with the core philosophy that shaped Archetype Original: clarity, responsibility, humility, and strength used in the right way.
                  </p>
                  
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 break-words">
                    Ask him anything — leadership tension, culture drift, team conflict, communication challenges, decision pressure. He answers with the same values I bring into the room.
                  </p>
                  
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[#1A1A1A]/70 break-words">
                    No noise. No ego. Just real guidance when you need it.
                  </p>
                </div>
                
                {/* CTA Button */}
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="mt-4 sm:mt-5 md:mt-6 inline-block bg-[#1A1A1A] text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Start a Conversation →
                </a>
              </div>
              
              {/* Right Column: Archy Chat Preview Box */}
              <div className="order-1 lg:order-2 border border-[#1A1A1A]/10 p-4 sm:p-6 md:p-8 lg:p-12">
                {/* Archy Message */}
                <div className="flex items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <OptimizedImage
                    src="/images/archy-avatar.png"
                    alt="Archy"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 object-cover"
                    width={48}
                    height={48}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="font-semibold text-base sm:text-lg text-[#1A1A1A] mb-2">Archy</div>
                    <p className="text-[#1A1A1A]/70 leading-relaxed text-base sm:text-lg">
                      Leadership isn't about control — it's about creating the conditions where people can thrive. What's holding your team back right now?
                    </p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-[#1A1A1A]/10 mb-6 sm:mb-8"></div>
                
                {/* Input field */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Archy anything..."
                    className="flex-1 bg-[#FAFAF9] border border-[#1A1A1A]/10 px-4 sm:px-6 py-3 sm:py-4 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]/30 transition-colors text-sm sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="bg-[#1A1A1A] text-white px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Overlay — full-width sheet on phone, centered card on md+ */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-8 bg-black/50 pointer-events-auto">
          <div className="w-full md:w-[55%] md:max-w-3xl h-[min(92dvh,100dvh)] md:h-[85vh] md:max-h-[800px] pointer-events-auto flex flex-col max-h-[100dvh]">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl h-full min-h-0 flex flex-col overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <OptimizedImage
                      src="/images/archy-avatar.png"
                      alt="Archy"
                      className="w-10 h-10 rounded-full border-0"
                      width={40}
                      height={40}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900">Archy</h3>
                    <p className="text-xs text-gray-500">AI Leadership Assistant</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChatOpen(false);
                    setInitialMessage('');
                    setInputValue('');
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors rounded-lg flex-shrink-0"
                  aria-label="Close chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-gray-50">
                <ChatApp context="home" initialMessage={initialMessage} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
