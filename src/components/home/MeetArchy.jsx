/**
 * Meet Archy Section
 * v0 Design - EXACT IMPLEMENTATION - Matches V0 UI perfectly
 */
import React, { useState } from 'react';
import ChatApp from '../../app/ChatApp';

export default function MeetArchy() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [previewInput, setPreviewInput] = useState('');

  const handlePreviewSubmit = (e) => {
    e.preventDefault();
    if (previewInput.trim()) {
      setInitialMessage(previewInput.trim());
      setIsChatOpen(true);
      setPreviewInput('');
    }
  };

  return (
    <>
      <section id="archy" className="py-16 sm:py-20 md:py-32 lg:py-40 bg-white">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Column: Text Content */}
              <div>
                <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance">
                  Meet Archy
                </h2>
                
                <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-10 md:mb-12">
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                    Archy is a digital version of how I think about people, culture, and leadership. He's built on the principles I've lived for thirty years—clarity, responsibility, humility, and strength held in the right way.
                  </p>
                  
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                    Ask him anything: Leadership questions. Team conflict. Decision tension. Culture issues.
                  </p>
                  
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] text-pretty">
                    He answers with the same values I teach in person. No noise. No ego. Just honest guidance when you need it.
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
                >
                  Start a Conversation
                </button>
              </div>
              
              {/* Right Column: Functional Chat Preview - Input opens full chat on submit */}
              <div>
                <div className="bg-[#FAFAF9] border border-[#1A1A1A]/10 p-8">
                  <div className="bg-white border border-[#1A1A1A]/10 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <img 
                      alt="Archy avatar" 
                      className="w-16 h-16 rounded-full flex-shrink-0 object-cover" 
                      src="/images/archy-avatar.png"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1A1A1A] mb-1">Archy</p>
                      <p className="text-[#6B6B6B] text-sm leading-relaxed">
                        "Leadership isn't about control—it's about creating space for others to grow. What's one thing holding your team back right now?"
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[#1A1A1A]/10 pt-4">
                    <form onSubmit={handlePreviewSubmit}>
                      <input 
                        placeholder="Ask Archy anything..." 
                        value={previewInput}
                        onChange={(e) => setPreviewInput(e.target.value)}
                        className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#1A1A1A]/10 text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#1A1A1A] transition-colors" 
                        type="text"
                      />
                    </form>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Chat Modal - Opens when user submits input */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsChatOpen(false)}>
          <div className="w-full max-w-2xl h-[85vh] max-h-[700px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
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
                  </div>
                  <span className="font-semibold text-[#2B2D2F]">Archy</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-[#6B6B6B] hover:text-[#2B2D2F] transition-colors text-2xl leading-none"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </div>

              {/* Chat App - Context-aware, with initial message if provided */}
              <div className="flex-1 overflow-hidden min-h-0">
                <ChatApp context="home" initialMessage={initialMessage} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
