import React, { useState, useEffect } from 'react';
import DarkHoursBanner from './components/DarkHoursBanner.jsx';
import MessageBubble from './components/MessageBubble.jsx';
import EscalationButton from './components/EscalationButton.jsx';

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [conversationState, setConversationState] = useState('greeting');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [isAbusive, setIsAbusive] = useState(false);

  // Simple delayed greeting sequence
  useEffect(() => {
    // Show flashing cursor after 1 second
    const cursorTimer = setTimeout(() => {
      setShowCursor(true);
    }, 1000);

    // Show dots after 2 seconds
    const dotsTimer = setTimeout(() => {
      setShowCursor(false);
      setShowDots(true);
    }, 2000);

    // Show greeting after 3.5 seconds
    const greetingTimer = setTimeout(() => {
      setShowDots(false);
      setShowGreeting(true);
      const greetingMessage = {
        text: "Hi, I'm Archy.\n\nI'm an AI that represents the work, philosophy, and experience of Bart Paden - a builder who's spent more than 32 years creating companies, growing people, and learning what makes both endure. You can ask me just about any question and I'll do my best to speak on his behalf. Go ahead and give it a try.",
        isUser: false,
        showButtons: false
      };
      setMessages([greetingMessage]);
    }, 3500);

    return () => {
      clearTimeout(cursorTimer);
      clearTimeout(dotsTimer);
      clearTimeout(greetingTimer);
    };
  }, []);

  const detectAbuse = (message) => {
    const abusiveKeywords = ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'idiot', 'stupid', 'hate', 'kill', 'die'];
    const aggressivePatterns = /(you're|you are|you)\s+(an?\s+)?(idiot|stupid|dumb|worthless|useless)/i;
    
    return abusiveKeywords.some(keyword => message.toLowerCase().includes(keyword)) || 
           aggressivePatterns.test(message);
  };

  const detectDisinterest = (message) => {
    const disinterestKeywords = ['not interested', 'don\'t want', 'no thanks', 'not for me', 'pass', 'skip', 'boring', 'waste of time'];
    return disinterestKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  const detectRelevantTopics = (message) => {
    const relevantKeywords = ['building', 'company', 'business', 'leadership', 'team', 'management', 'startup', 'growth', 'strategy', 'culture', 'clarity', 'mentor', 'consulting', 'help', 'advice', 'guidance'];
    return relevantKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Check for abuse first
    if (detectAbuse(messageText)) {
      if (isAbusive) {
        // Second offense - shut down chat
        const shutdownMessage = {
          text: "You crossed a line, so I'm taking my stuff and going home.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Contact Bart directly", value: "contact_direct" }
          ]
        };
        setMessages(prev => [...prev, shutdownMessage]);
        return;
      } else {
        // First offense - warning
        setIsAbusive(true);
        const warningMessage = {
          text: "I'm here to help with business and leadership questions. Let's get back on track - what's really going on that I can help with?",
          isUser: false,
          showButtons: false
        };
        setMessages(prev => [...prev, warningMessage]);
        return;
      }
    }

    // Check for disinterest
    if (detectDisinterest(messageText)) {
      const analogMessage = {
        text: "I get it. This AI stuff freaks us out too.",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Go Analog", value: "go_analog" }
        ]
      };
      setMessages(prev => [...prev, analogMessage]);
      return;
    }

    // Check if this should trigger structured conversation
    if (detectRelevantTopics(messageText)) {
      const pathMessage = {
        text: "That sounds like something I can help with. Where are you in your journey right now?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "I'm building or leading a company", value: "building" },
          { text: "I'm stepping into leadership", value: "leading" },
          { text: "I want personal or professional clarity", value: "clarity" },
          { text: "I just want to learn more about Bart", value: "learn" }
        ]
      };
      setMessages(prev => [...prev, pathMessage]);
      setConversationState('path_selection');
      return;
    }

    // Default to AI conversation for other topics
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = { text: data.response, isUser: false };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.shouldEscalate) {
        setShowEscalation(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleButtonClick = (value) => {
    if (value === 'go_analog') {
      // Go Analog - scroll to traditional site sections
      const userMessage = { text: "Go Analog", isUser: true };
      setMessages(prev => [...prev, userMessage]);
      
      const response = {
        text: "Perfect! I'll scroll you down to explore the traditional site structure. You can always come back here to chat with me anytime.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
      
      // Scroll to About section
      setTimeout(() => {
        const aboutSection = document.getElementById('about');
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 1000);
    } else if (value === 'contact_direct') {
      // Contact Bart directly
      window.open('https://calendly.com/bartpaden', '_blank');
    } else if (value.startsWith('calendly_')) {
      // Handle Calendly links
      const calendlyUrl = process.env.REACT_APP_CALENDLY_URL || 'https://calendly.com/bartpaden';
      window.open(calendlyUrl, '_blank');
      
      const response = {
        text: "I've opened Bart's calendar for you. Once you've scheduled, we can continue the conversation here.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
    } else {
      // Handle structured conversation paths
      handleStructuredResponse(value);
    }
  };

  const handleStructuredResponse = (value) => {
    const userMessage = { text: getPathText(value), isUser: true };
    setMessages(prev => [...prev, userMessage]);

    let response;
    let nextState;

    switch (value) {
      case 'building':
        response = {
          text: "That's where Bart spent most of his life — leading creative teams, building software companies, and helping organizations grow without losing their soul.\n\nHe now consults founders and operators who need structure, alignment, and systems that hold when things get hard.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Show me how business consulting works", value: "consulting_how" },
            { text: "I'd like to schedule a call", value: "schedule_business" }
          ]
        };
        nextState = 'building_options';
        break;

      case 'leading':
        response = {
          text: "Every great leader starts right here — capable, curious, and looking for direction.\n\nBart mentors emerging leaders, helping them build clarity, confidence, and the habits that make leadership sustainable.\nNo jargon. No theory. Just the logic of how leadership actually works.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Learn the principles", value: "principles" },
            { text: "Schedule mentorship", value: "schedule_mentorship" }
          ]
        };
        nextState = 'leading_options';
        break;

      case 'clarity':
        response = {
          text: "Sometimes growth isn't about fixing a company — it's about finding your footing again.\n\nBart works with individuals who want to rediscover purpose, rebuild confidence, and make better decisions after big transitions.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Learn about clarity mentoring", value: "clarity_how" },
            { text: "Schedule a clarity session", value: "schedule_clarity" }
          ]
        };
        nextState = 'clarity_options';
        break;

      case 'learn':
        response = {
          text: "Bart Paden is a lifelong builder — designer turned entrepreneur, founder turned mentor.\nHe's led creative and technical teams, built companies from nothing, and helped hundreds of people grow along the way.\n\nToday he channels that experience into Archetype Original, helping others build what lasts — businesses, teams, and lives with structure and soul.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Read more of his story", value: "story" },
            { text: "See how he helps", value: "help" }
          ]
        };
        nextState = 'learn_options';
        break;

      default:
        response = {
          text: "That doesn't fit neatly into one of my usual paths, and that's okay. Tell me more about what's happening, and I'll find the best way to help.",
          isUser: false,
          showButtons: false
        };
        nextState = 'freeform';
    }

    setMessages(prev => [...prev, response]);
    setConversationState(nextState);
  };

  const getPathText = (path) => {
    const pathTexts = {
      'building': "I'm building or leading a company",
      'leading': "I'm stepping into leadership",
      'clarity': "I want personal or professional clarity",
      'learn': "I just want to learn more about Bart"
    };
    return pathTexts[path] || path;
  };

  const handleEscalate = async (triageAnswers, conversationHistory) => {
    try {
      const response = await fetch('/api/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'User requested live handoff',
          timestamp: new Date().toISOString(),
          conversationHistory,
          triageAnswers,
          sessionId
        }),
      });

      const data = await response.json();

      const handoffMessage = {
        text: data.message || 'Your handoff request has been submitted. We\'ll be in touch soon!',
        isUser: false
      };
      setMessages(prev => [...prev, handoffMessage]);
      setShowEscalation(false);
    } catch (error) {
      console.error('Error submitting handoff:', error);
      const errorMessage = {
        text: 'Sorry, there was an error submitting your handoff request. Please try again.',
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="py-8 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <DarkHoursBanner />

        <div className="text-center mb-8">
          {/* Loading Animation */}
          {messages.length === 0 && !showGreeting && (
            <div className="mb-8">
              {showCursor && (
                <div className="text-5xl text-black mb-4">
                  <span className="animate-pulse">|</span>
                </div>
              )}
              {showDots && (
                <div className="text-5xl text-black mb-4">
                  <span className="animate-pulse">...</span>
                </div>
              )}
              {!showCursor && !showDots && (
                <div className="text-5xl text-gray-400 mb-4">
                  <span className="animate-pulse">...</span>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message.text}
                  isUser={message.isUser}
                  showButtons={message.showButtons}
                  buttonOptions={message.buttonOptions}
                  onButtonClick={handleButtonClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="max-w-2xl mx-auto">
          {showEscalation && (
            <EscalationButton 
              onEscalate={handleEscalate} 
              conversationHistory={messages.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              }))}
            />
          )}

          <div className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 text-lg border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:border-gray-500 rounded-lg"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="bg-gray-800 text-white px-6 py-3 text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}