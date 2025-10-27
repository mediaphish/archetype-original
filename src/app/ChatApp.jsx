// src/app/ChatApp.jsx
import React, { useState, useRef, useEffect } from 'react';
import DarkHoursBanner from './components/DarkHoursBanner.jsx';
import MessageBubble from './components/MessageBubble.jsx';
import EscalationButton from './components/EscalationButton.jsx';

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [conversationState, setConversationState] = useState('greeting');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation with greeting sequence
  useEffect(() => {
    if (messages.length === 0) {
      const greetingMessages = [
        {
          text: "Hi, I'm Archetype.\n\nI represent the work, philosophy, and experience of Bart Paden — a builder who's spent more than 32 years creating companies, growing people, and learning what makes both endure.",
          isUser: false,
          showButtons: false
        },
        {
          text: "This isn't a coaching platform or corporate agency.\n\nIt's the continuation of a real career — one built from the ground up through startups, software, fitness, and leadership teams that learned to thrive under pressure.\n\nBart calls it Archetype Original — because it's about rediscovering what's proven and building something new from it.",
          isUser: false,
          showButtons: false
        },
        {
          text: "Where are you in your own journey right now?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "I'm building or leading a company", value: "building" },
            { text: "I'm stepping into leadership", value: "leading" },
            { text: "I want personal or professional clarity", value: "clarity" },
            { text: "I just want to learn more about Bart", value: "learn" }
          ]
        }
      ];
      
      setMessages(greetingMessages);
      setConversationState('path_selection');
    }
  }, []);

  const handlePathSelection = (path) => {
    const userMessage = { text: getPathText(path), isUser: true };
    setMessages(prev => [...prev, userMessage]);

    let response;
    let nextState;

    switch (path) {
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
    
    // Show final CTA after a few interactions
    if (messages.length > 6 && !messages.some(msg => msg.text.includes('What are you building'))) {
      setTimeout(() => showFinalCTA(), 2000);
    }
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

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // If we're in freeform mode, use the API
    if (conversationState === 'freeform') {
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
    } else {
      // Handle structured conversation
      handleStructuredResponse(messageText);
    }
  };

  const handleStructuredResponse = (messageText) => {
    // Handle deep conversation paths
    let response;
    let nextState = conversationState;

    if (conversationState === 'building_options') {
      if (messageText.includes('consulting') || messageText.includes('how')) {
        response = {
          text: "Most businesses don't fail because of competition — they fail because of misalignment.\nThe system stops serving the people, and people stop serving the mission.\n\nArchetype Original helps fix both.\nWe clarify direction, rebuild communication, and realign teams around a shared goal.\n\nWould you like to see examples of that work or set up a time with Bart?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Show examples", value: "examples" },
            { text: "Schedule with Bart", value: "schedule_business" }
          ]
        };
        nextState = 'consulting_deep';
      } else if (messageText.includes('schedule')) {
        response = {
          text: "Perfect. I'll connect you with Bart's calendar for a business consultation.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Open Calendly", value: "calendly_business" }
          ]
        };
        nextState = 'scheduling';
      }
    } else if (conversationState === 'leading_options') {
      if (messageText.includes('principles') || messageText.includes('learn')) {
        response = {
          text: "Archetype Original teaches five fundamentals every great leader builds on:\n\n• Clarity Beats Chaos – People can't follow what they can't see.\n• Protect the Culture – Values before convenience.\n• Build Trust Daily – It's math, not magic.\n• Empower Over Control – Ownership outlasts oversight.\n• Serve the Standard – People rise to what you model.\n\nWould you like to talk about how to apply these where you are?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Apply them", value: "apply_principles" },
            { text: "Schedule mentorship", value: "schedule_mentorship" }
          ]
        };
        nextState = 'principles_deep';
      } else if (messageText.includes('schedule')) {
        response = {
          text: "Great. I'll connect you with Bart's calendar for leadership mentorship.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Open Calendly", value: "calendly_mentorship" }
          ]
        };
        nextState = 'scheduling';
      }
    }

    if (response) {
      setMessages(prev => [...prev, response]);
      setConversationState(nextState);
    } else {
      // Fall back to freeform if we don't recognize the response
      setConversationState('freeform');
      const fallbackResponse = {
        text: "That doesn't fit neatly into one of my usual paths, and that's okay. Tell me more about what's happening, and I'll find the best way to help.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, fallbackResponse]);
    }
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt);
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
          triageAnswers
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

  const showFinalCTA = () => {
    const response = {
      text: "Every business. Every leader. Every builder.\nIt always comes back to one question:\n\nWhat are you building, and how can we make it better?\n\nWould you like to start a conversation with Bart today?",
      isUser: false,
      showButtons: true,
      buttonOptions: [
        { text: "Yes, connect me", value: "final_connect" },
        { text: "Not yet", value: "not_yet" },
        { text: "Show me more content", value: "more_content" }
      ]
    };
    setMessages(prev => [...prev, response]);
  };

  const handleButtonClick = (value) => {
    if (value.startsWith('calendly_')) {
      // Handle Calendly links
      const calendlyType = value.replace('calendly_', '');
      const calendlyUrl = process.env.REACT_APP_CALENDLY_URL || 'https://calendly.com/bartpaden';
      window.open(calendlyUrl, '_blank');
      
      const response = {
        text: "I've opened Bart's calendar for you. Once you've scheduled, we can continue the conversation here.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'final_connect') {
      // Final CTA - connect to Bart
      const response = {
        text: "Perfect. I'll connect you with Bart's calendar.",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Open Calendly", value: "calendly_final" }
        ]
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'not_yet') {
      // Not yet - offer resources
      const response = {
        text: "No problem. I'll send you a short leadership resource that might be helpful. What's your email?",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
      setConversationState('freeform');
    } else if (value === 'more_content') {
      // Show more content
      const response = {
        text: "You can find more content on our journal at archetypeoriginal.com/journal. Is there anything specific you'd like to explore?",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, response]);
      setConversationState('freeform');
    } else if (value === 'schedule_business' || value === 'schedule_mentorship' || value === 'schedule_clarity') {
      // Handle scheduling
      const response = {
        text: "Perfect. I'll connect you with Bart's calendar.",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Open Calendly", value: `calendly_${value.replace('schedule_', '')}` }
        ]
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'examples' || value === 'apply_principles' || value === 'clarity_how' || value === 'story' || value === 'help') {
      // Handle deep dive responses
      let response;
      
      if (value === 'examples') {
        response = {
          text: "Here are some examples of how Archetype Original helps businesses:\n\n• Team alignment workshops that get everyone on the same page\n• Communication systems that prevent breakdowns before they happen\n• Leadership development that builds confidence and clarity\n• Culture audits that identify what's working and what needs fixing\n\nWould you like to see case studies or schedule a consultation?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "See case studies", value: "case_studies" },
            { text: "Schedule consultation", value: "schedule_business" }
          ]
        };
      } else if (value === 'apply_principles') {
        response = {
          text: "Let's talk about how to apply these principles where you are. What's your biggest leadership challenge right now?",
          isUser: false,
          showButtons: false
        };
        setConversationState('freeform');
      } else if (value === 'clarity_how') {
        response = {
          text: "Clarity mentoring helps you rediscover your purpose and rebuild confidence after big transitions. Bart works one-on-one to help you find your footing and make better decisions.\n\nWould you like to learn more about the process or schedule a session?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Learn about the process", value: "process" },
            { text: "Schedule a session", value: "schedule_clarity" }
          ]
        };
      } else if (value === 'story') {
        response = {
          text: "Bart's story is one of continuous building and learning. From designer to entrepreneur to mentor, he's always been focused on what makes teams and businesses thrive under pressure.\n\nWould you like to read his full story or see how he can help you?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Read full story", value: "full_story" },
            { text: "See how he helps", value: "help" }
          ]
        };
      } else if (value === 'help') {
        response = {
          text: "Bart helps in three main ways:\n\n• Business consulting for founders and operators\n• Leadership mentorship for emerging leaders\n• Clarity mentoring for personal and professional transitions\n\nWhat resonates most with where you are?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Business consulting", value: "building" },
            { text: "Leadership mentorship", value: "leading" },
            { text: "Clarity mentoring", value: "clarity" }
          ]
        };
      }
      
      if (response) {
        setMessages(prev => [...prev, response]);
      }
    } else {
      // Handle path selection
      handlePathSelection(value);
    }
  };

  return (
    <section className="section bg-slate-50">
      <div className="container">
        <div className="card max-w-4xl mx-auto">
          <DarkHoursBanner />
          
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="h2">Let's Talk</h2>
              <p className="p mt-2">How can I help you today?</p>
            </div>


            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-xl mb-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <p>Start a conversation by typing a message or selecting a quick prompt above.</p>
                </div>
              )}
              
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
              <div ref={messagesEndRef} />
            </div>

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
                className="input flex-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}