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
      <section id="archy" className="pt-12 md:pt-16 lg:pt-24 pb-8 bg-white">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text Content */}
            <div>
              <div className="inline-block bg-[#F5E6D3] px-4 py-2 rounded-full mb-6">
                <span className="text-sm font-semibold text-[#C85A3C] uppercase tracking-wide">Your AI Guide</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2B2D2F] mb-6 font-serif">
                Meet Archy
              </h2>
              
              <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-4">
                Archy is a digital version of how I think about people, culture, and leadership. He's built on the principles I've lived for thirty years—clarity, responsibility, humility, and strength held in the right way.
              </p>
              
              <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-4">
                Ask him anything: Leadership questions. Team conflict. Decision tension. Culture issues.
              </p>
              
              <p className="text-base md:text-lg lg:text-xl leading-relaxed text-[#6B6B6B] mb-8">
                He answers with the same values I teach in person. No noise. No ego. Just honest guidance when you need it.
              </p>
              
              <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-[#C85A3C] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Start a Conversation
              </button>
            </div>
            
            {/* Right Column: Functional Chat Preview - Input opens full chat on submit */}
            <div>
              <div className="bg-gradient-to-br from-sand to-cream rounded-3xl p-8 shadow-xl">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
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
                      <p className="text-sm font-medium text-[#2B2D2F] mb-1">Archy</p>
                      <p className="text-[#6B6B6B] text-sm leading-relaxed">
                        "Leadership isn't about control—it's about creating space for others to grow. What's one thing holding your team back right now?"
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <form onSubmit={handlePreviewSubmit}>
                      <input 
                        placeholder="Ask Archy anything..." 
                        value={previewInput}
                        onChange={(e) => setPreviewInput(e.target.value)}
                        className="w-full px-4 py-3 bg-[#E8D5C4]/30 rounded-xl text-sm placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C85A3C]/20" 
                        type="text"
                      />
                    </form>
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
          <div className="w-full max-w-md h-[85vh] max-h-[700px] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
