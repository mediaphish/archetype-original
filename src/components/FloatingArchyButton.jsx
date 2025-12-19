import React, { useState, useEffect } from 'react';
import ChatApp from '../app/ChatApp';

export default function FloatingArchyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState('default');

  // Detect context based on current path
  useEffect(() => {
    const updateContext = () => {
      const path = window.location.pathname;
      
      if (path === '/') {
        setContext('home');
      } else if (path === '/journal' || path.startsWith('/journal/')) {
        setContext('journal');
      } else if (path === '/methods/mentorship') {
        setContext('methods-mentorship');
      } else if (path === '/methods/consulting') {
        setContext('methods-consulting');
      } else if (path === '/methods/training-education') {
        setContext('methods-training-education');
      } else if (path === '/methods/fractional-roles') {
        setContext('methods-fractional-roles');
      } else if (path === '/methods/speaking-seminars') {
        setContext('methods-speaking-seminars');
      } else if (path === '/methods/fractional-roles/cco') {
        setContext('methods-fractional-cco');
      } else if (path === '/methods' || path.startsWith('/methods/')) {
        setContext('methods');
      // Mentoring placeholder pages removed
      } else if (path === '/culture-science' || path.startsWith('/culture-science/')) {
        setContext('culture-science');
      } else if (path === '/archy' || path.startsWith('/archy/')) {
        setContext('archy');
      } else if (path === '/philosophy') {
        setContext('philosophy');
      } else if (path === '/meet-bart') {
        setContext('about');
      } else if (path === '/contact') {
        setContext('contact');
      } else {
        setContext('default');
      }
    };

    updateContext();
    window.addEventListener('popstate', updateContext);
    
    return () => {
      window.removeEventListener('popstate', updateContext);
    };
  }, []);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Chat with Archy"
      >
        <img
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </button>

      {/* Chat Overlay - Opens when button is clicked */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-xl h-[85vh] max-h-[700px] pointer-events-auto flex flex-col">
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
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Archy</h3>
                    <p className="text-xs text-gray-500">AI Leadership Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  aria-label="Close chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <ChatApp context={context} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
