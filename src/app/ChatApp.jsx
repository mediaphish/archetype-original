import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './components/MessageBubble.jsx';
import EscalationButton from './components/EscalationButton.jsx';

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [conversationState, setConversationState] = useState('greeting');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showGreeting, setShowGreeting] = useState(false);
  const [isAbusive, setIsAbusive] = useState(false);
  const messagesEndRef = useRef(null);

  // NO AUTO-SCROLL - let users control their own scrolling

  // Show greeting immediately
  useEffect(() => {
    setShowGreeting(true);
    const greetingMessage = {
      text: "Hi, I'm Archy.\n\nI'm an AI that represents the work, philosophy, and experience of Bart Paden - a builder who's spent more than 32 years creating companies, growing people, and learning what makes both endure. You can ask me just about any question and I'll do my best to speak on his behalf. Go ahead and give it a try.",
      isUser: false,
      showButtons: false
    };
    setMessages([greetingMessage]);
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

  const detectJourneyStage = (message) => {
    const messageLower = message.toLowerCase();
    
    // Check for specific journey indicators
    if (messageLower.includes('stepping into leadership') || 
        messageLower.includes('new leader') || 
        messageLower.includes('emerging leader') ||
        messageLower.includes('first leadership role')) {
      return 'leading';
    }
    
    if (messageLower.includes('building') || 
        messageLower.includes('leading a company') || 
        messageLower.includes('founder') ||
        messageLower.includes('ceo') ||
        messageLower.includes('executive')) {
      return 'building';
    }
    
    if (messageLower.includes('clarity') || 
        messageLower.includes('transition') || 
        messageLower.includes('purpose') ||
        messageLower.includes('direction') ||
        messageLower.includes('lost')) {
      return 'clarity';
    }
    
    if (messageLower.includes('learn about bart') || 
        messageLower.includes('who is bart') || 
        messageLower.includes('tell me about bart')) {
      return 'learn';
    }
    
    return null;
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

    // Always go to AI conversation - no structured paths
    // Let the AI handle everything naturally

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
      const assistantMessage = { 
        text: data.response, 
        isUser: false,
        showButtons: data.suggestedButtons ? true : false,
        buttonOptions: data.suggestedButtons || undefined
      };
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
    } else if (value === 'mentorship') {
      // Handle mentorship guidance
      const userMessage = { text: "I want mentorship guidance", isUser: true };
      setMessages(prev => [...prev, userMessage]);
      
      const response = {
        text: "Perfect! Bart's mentorship focuses on practical leadership development. He helps emerging leaders build clarity, confidence, and sustainable habits through his five fundamentals framework.\n\nHis approach is hands-on and based on 32 years of real experience. He typically works with leaders through 30-60 minute focused sessions.\n\nWhat specific leadership challenge would you like to work on?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Schedule mentorship call", value: "calendly_schedule" },
          { text: "Learn the five fundamentals", value: "fundamentals" }
        ]
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'fundamentals') {
      // Handle five fundamentals explanation
      const userMessage = { text: "Learn the five fundamentals", isUser: true };
      setMessages(prev => [...prev, userMessage]);
      
      const response = {
        text: "Here are Bart's five leadership fundamentals:\n\n1. **Clarity beats chaos** - People can't follow what they can't see. Clear direction, clear expectations, clear outcomes.\n\n2. **Protect the culture** - Values before convenience. When pressure hits, culture is what holds.\n\n3. **Build trust daily** - It's math, not magic. Small consistent actions compound into unshakeable trust.\n\n4. **Empower over control** - Ownership outlasts oversight. Give people the tools and space to succeed.\n\n5. **Serve the standard** - People rise to what you model. Your behavior sets the bar.\n\nThese aren't theory - they're battle-tested principles from 32 years of building teams and companies. Which one resonates most with your current situation?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Schedule a call to discuss", value: "calendly_schedule" },
          { text: "Tell me more about my situation", value: "mentorship" }
        ]
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'handoff') {
      // Handle live handoff request
      const userMessage = { text: "Request live handoff", isUser: true };
      setMessages(prev => [...prev, userMessage]);
      
      const response = {
        text: "Perfect! I'll set up a live handoff to Bart. He'll get a brief of our conversation and can jump in to help you directly.\n\nThis will send him a summary of what we've discussed so he can provide more personalized guidance.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
      
      // Trigger escalation
      setShowEscalation(true);
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
      e.stopPropagation();
      handleSendMessage();
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSendMessage();
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-white relative">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-4 h-full">
        {/* Messages Area - Scrollable container with fixed height */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-300px)]">
          {messages.length > 0 && (
            <div className="space-y-6 max-w-2xl mx-auto py-8">
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

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 max-w-2xl mx-auto w-full p-4 bg-white border-t border-gray-200">
          {showEscalation && (
            <EscalationButton 
              onEscalate={handleEscalate} 
              conversationHistory={messages.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              }))}
            />
          )}

          <form onSubmit={handleFormSubmit} className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={(e) => e.preventDefault()}
              placeholder="Tell me what's going on."
              className="flex-1 px-4 py-3 text-lg border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:border-gray-500 rounded-lg"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-gray-800 text-white px-6 py-3 text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Bouncing Down Arrow - Fixed position */}
      <div className="fixed right-8 bottom-8 z-40">
        <div 
          className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transition-colors animate-bounce"
          onClick={() => {
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
              aboutSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Analog stuff down here</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
