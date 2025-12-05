/**
 * Ask Archy Anything Section
 * Editorial Minimal Design - Embedded Chat Interface
 */
import React, { useState } from 'react';
import ChatApp from '../../app/ChatApp';

export default function MeetArchy() {
  const [chatKey, setChatKey] = useState(0);
  const [initialMessage, setInitialMessage] = useState('');

  const handleStarterQuestion = (question) => {
    setInitialMessage(question);
    setChatKey(prev => prev + 1);
  };

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-center">
            Ask Archy Anything
          </h2>
          
          <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-12 sm:mb-16 text-center max-w-3xl mx-auto">
            Archy is the AI assistant I've trained on 30+ years of leadership experience, research, and real-world culture work. Ask him about servant leadership, culture, decision-making, or what might fit your situation. If he can't answer, he'll point you toward someone who can.
          </p>
          
          {/* Embedded Archy Chat Interface */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#1A1A1A]/10 rounded-lg p-8 md:p-10 shadow-sm">
              <div className="h-[500px] flex flex-col overflow-hidden relative">
                <ChatApp key={chatKey} context="home" initialMessage={initialMessage} />
              </div>
              
              {/* Starter Questions */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleStarterQuestion('What is servant leadership?')}
                  className="text-xs px-3 py-1.5 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors"
                >
                  What is servant leadership?
                </button>
                <button
                  onClick={() => handleStarterQuestion('How do I know if my culture is healthy?')}
                  className="text-xs px-3 py-1.5 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors"
                >
                  How do I know if my culture is healthy?
                </button>
                <button
                  onClick={() => handleStarterQuestion('What offering might fit my situation?')}
                  className="text-xs px-3 py-1.5 border border-[#1A1A1A]/20 rounded-md text-[#1A1A1A] hover:bg-[#FAFAF9] transition-colors"
                >
                  What offering might fit my situation?
                </button>
              </div>
            </div>
            
            {/* CTA below chat */}
            <div className="mt-6 text-center">
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/contact');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-sm text-[#6B6B6B] hover:underline"
              >
                Want to talk to Bart directly?
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
