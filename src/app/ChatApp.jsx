import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './components/MessageBubble.jsx';
import EscalationButton from './components/EscalationButton.jsx';
import InlineContactForm from './components/InlineContactForm.jsx';
import CannotAnswerContactForm from './components/CannotAnswerContactForm.jsx';

export default function ChatApp({ context = 'default', initialMessage = '' }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [conversationState, setConversationState] = useState('greeting');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showGreeting, setShowGreeting] = useState(false);
  const [isAbusive, setIsAbusive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSentInitialMessage, setHasSentInitialMessage] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCannotAnswerForm, setShowCannotAnswerForm] = useState(false);
  const [cannotAnswerQuestion, setCannotAnswerQuestion] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);


  // Show greeting immediately - context-aware (skip if initialMessage provided)
  useEffect(() => {
    if (initialMessage) {
      // Skip greeting if user already has a question
      setMessages([]);
      return;
    }
    
    setShowGreeting(true);
    let greetingText;
    
    if (context === 'home') {
      greetingText = "Hi, I'm Archy. I see you're exploring the homepage. I'm here to help you understand servant leadership, culture building, and how Bart's 32+ years of experience can help your business. What would you like to know about leadership, culture, or how we can work together?";
    } else if (context === 'journal') {
      greetingText = "Hi, I'm Archy. I see you're reading the journal. I can help you dive deeper into any of these leadership topics or answer questions about the ideas Bart shares. What would you like to explore?";
    } else if (context === 'methods-speaking-seminars') {
      greetingText = "Hi, I'm Archy. I see you're exploring Speaking & Seminars. What questions do you have about how Bart speaks, what he covers, or whether this might be right for your organization?";
    } else if (context === 'methods-mentorship') {
      greetingText = "Hi, I'm Archy. You're looking at Mentorship. I can help you understand how Bart works with leaders one-on-one, what mentorship looks like, and whether this might be a good fit. What would you like to know?";
    } else if (context === 'methods-consulting') {
      greetingText = "Hi, I'm Archy. You're exploring Consulting. I can help answer questions about how Bart works with teams and organizations, what consulting engagements look like, and how this might help your situation. What questions do you have?";
    } else if (context === 'methods-training-education') {
      greetingText = "Hi, I'm Archy. I see you're looking at Training & Education. I can help you understand what these offerings include, who they're for, and how they might benefit your team or organization. What would you like to know?";
    } else if (context === 'methods-fractional-roles') {
      greetingText = "Hi, I'm Archy. You're exploring Fractional Roles. I can help answer questions about how fractional leadership works, when it's the right fit, and what roles Bart can step into. What questions do you have?";
    } else if (context === 'methods') {
      greetingText = "Hi, I'm Archy. You're exploring Methods—how Bart works with leaders, teams, and organizations. I can help you understand the different approaches, what to expect, and which might be right for you. What would you like to know?";
    } else if (context === 'mentoring') {
      greetingText = "Hi, I'm Archy. You're looking at our mentoring and consulting services. I can help you understand how Bart works with leaders and teams, what to expect, and whether this might be a good fit for you. What questions do you have?";
    } else if (context === 'culture-science') {
      greetingText = "Hi, I'm Archy. You're exploring Culture Science and ALI. I can help explain how we measure culture, what the research shows, and how ALI can help your organization. What would you like to know?";
    } else if (context === 'archy') {
      greetingText = "Hi, I'm Archy. You're learning about me! I'm here to help you understand how I work, what I know, and how I can assist you. Feel free to ask me anything about leadership, culture, or Bart's work.";
    } else if (context === 'philosophy') {
      greetingText = "Hi, I'm Archy. You're exploring Bart's philosophy on leadership. I can help you understand these principles more deeply and how they apply in practice. What would you like to discuss?";
    } else if (context === 'about') {
      greetingText = "Hi, I'm Archy. You're reading about Bart. I can help answer questions about his background, experience, and approach. What would you like to know?";
    } else {
      greetingText = "Hi, I'm Archy.\n\nI'm an AI that represents the work, philosophy, and experience of Bart Paden - a builder who's spent more than 32 years creating companies, growing people, and learning what makes both endure. You can ask me just about any question and I'll do my best to speak on his behalf. Go ahead and give it a try.";
    }
    
    const greetingMessage = {
      text: greetingText,
      isUser: false,
      showButtons: false
    };
    setMessages([greetingMessage]);
  }, [context, initialMessage]);

  // Auto-send initial message if provided (from preview input)
  useEffect(() => {
    if (initialMessage && !hasSentInitialMessage) {
      // Wait a moment for component to mount, then send initial message
      const timer = setTimeout(() => {
        setHasSentInitialMessage(true);
        setInputValue(initialMessage);
        // handleSendMessage will add the user message itself, so we don't add it here
        handleSendMessage(initialMessage);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, hasSentInitialMessage]);

  const detectAbuse = (message) => {
    const messageLower = message.toLowerCase();
    
    // Context-aware abuse detection - only flag actual threats/insults, not casual language
    // Words that are ONLY abusive when directed at someone or used as threats
    const directedInsults = [
      /(you're|you are|you)\s+(an?\s+)?(idiot|stupid|dumb|worthless|useless|asshole|bitch)/i,
      /(fuck|shit)\s+(you|off|yourself)/i,
      /(go|get)\s+(fuck|die)/i
    ];
    
    // Direct threats
    const threats = [
      /(kill|die|hurt|harm)\s+(you|yourself|your|me|myself)/i,
      /(hope|wish)\s+(you|they|he|she)\s+(die|kill|hurt)/i
    ];
    
    // Check for directed insults or threats
    const hasDirectedInsult = directedInsults.some(pattern => pattern.test(message));
    const hasThreat = threats.some(pattern => pattern.test(message));
    
    // Only flag if it's actually abusive (directed at someone or threatening)
    // Allow casual language like "damn, that's awesome" or "this is shit" (describing a situation)
    return hasDirectedInsult || hasThreat;
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
    if (!messageText.trim() || isLoading || isBlocked) return;

    const userMessage = { text: messageText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Check for obvious abuse patterns first (client-side quick check)
    // But don't block - let server AI assess the real threat level
    const hasObviousAbuse = detectAbuse(messageText);
    
    if (hasObviousAbuse) {
      // Still send to server, but also assess with AI on server side
      // Server will determine if it's a real threat or just casual language
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
      setIsLoading(false);
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

      // First, assess threat with AI if message seems problematic
      if (hasObviousAbuse) {
        try {
          const threatAssessment = await fetch('/api/chat/assess-threat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              message: messageText,
              conversationHistory
            })
          });

          const assessmentData = await threatAssessment.json();
          
          if (assessmentData.blocked) {
            setIsBlocked(true);
            setIsLoading(false);
            
            let blockMessage;
            if (assessmentData.blockType === 'permanent') {
              blockMessage = {
                text: "This conversation has been terminated due to threatening behavior. The chat is now permanently closed.",
                isUser: false,
                showButtons: false
              };
            } else {
              // Temporary 24-hour block
              const expiresAt = new Date(assessmentData.expiresAt);
              const hoursRemaining = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60));
              blockMessage = {
                text: `Due to repeated inappropriate behavior, this chat has been temporarily suspended. You can try again in ${hoursRemaining} hours.`,
                isUser: false,
                showButtons: false
              };
            }
            
            setMessages(prev => [...prev, blockMessage]);
            return;
          }
        } catch (err) {
          console.error('Error assessing threat:', err);
          // Continue to normal chat flow if assessment fails
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          sessionId,
          context: context || 'default'
        }),
      });

      // Check if session is blocked
      if (response.status === 403) {
        const data = await response.json();
        if (data.blocked) {
          setIsBlocked(true);
          let blockMessage;
          if (data.expiresAt) {
            const expiresAt = new Date(data.expiresAt);
            const hoursRemaining = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60));
            blockMessage = {
              text: `This session has been temporarily blocked. You can try again in ${hoursRemaining} hours.`,
              isUser: false,
              showButtons: false
            };
          } else {
            blockMessage = {
              text: "This session has been permanently blocked due to inappropriate behavior. The chat is now closed.",
              isUser: false,
              showButtons: false
            };
          }
          setMessages(prev => [...prev, blockMessage]);
          setIsLoading(false);
          return;
        }
      }

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

      // Handle cannot answer scenario
      if (data.cannotAnswer) {
        setCannotAnswerQuestion(messageText);
        setShowCannotAnswerForm(true);
      }

      if (data.shouldEscalate) {
        // Empathetic prompt with two clear options
        const escalatePrompt = {
          text: "Looks like you may need to talk with Bart directly. We can do that. Here are two options:",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: 'Send an Email', value: 'handoff_email' },
            { text: 'Schedule a 1-on-1 meeting', value: 'handoff_schedule' }
          ]
        };
        setMessages(prev => [...prev, escalatePrompt]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.message, error.stack);
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
    } else if (value === 'handoff_email') {
      // Start the handoff triage/contact flow in-app
      setShowEscalation(true);
    } else if (value === 'show_contact_form') {
      // Show inline contact form
      setShowContactForm(true);
      const response = {
        text: "I can't share Bart's email directly, but you can reach him through this contact form. He checks these messages regularly and will respond to you.",
        isUser: false,
        showButtons: false,
        showContactForm: true
      };
      setMessages(prev => [...prev, response]);
    } else if (value === 'handoff_schedule') {
      // Open Bart's Calendly directly (provided link)
      window.open('https://calendly.com/bartpaden/1-on-1-mentorships', '_blank');
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

      const blocks = [];
      blocks.push({ text: data.message || 'Your handoff request has been submitted. We\'ll be in touch soon!', isUser: false });
      if (data.calendlyUrl) {
        blocks.push({
          text: 'You can also schedule time with Bart now:',
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: 'Schedule a 1-on-1 meeting', value: 'handoff_schedule' }
          ]
        });
      }

      setMessages(prev => [...prev, ...blocks]);
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
    if (!isLoading && !isBlocked && inputValue.trim()) {
      handleSendMessage();
    }
    return false;
  };

  return (
    <div className="h-full flex flex-col bg-white relative chat-container">
      <div className="flex-1 flex flex-col w-full mx-auto px-4 md:px-6 h-full">
        {/* Messages Area - Scrollable container with fixed height */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100% - 120px)' }}>
          {messages.length > 0 && (
            <div className="py-8">
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
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-warm-offWhiteAlt rounded-lg px-4 py-3 max-w-xs border border-warm-border">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-amber rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-amber rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-amber rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-warm-gray">Archy is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
              {/* Cannot Answer Contact Form */}
              {showCannotAnswerForm && cannotAnswerQuestion && (
                <div className="px-4 pb-4">
                  <CannotAnswerContactForm
                    question={cannotAnswerQuestion}
                    onSuccess={() => {
                      setShowCannotAnswerForm(false);
                      setCannotAnswerQuestion(null);
                    }}
                    onSkip={() => {
                      // Email was already sent when cannotAnswer was detected in chat.js
                      // Just close the form and allow chat to continue
                      setShowCannotAnswerForm(false);
                      setCannotAnswerQuestion(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 w-full p-4 bg-white border-t border-gray-200">
          {showEscalation && (
            <EscalationButton 
              onEscalate={handleEscalate} 
              conversationHistory={messages.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              }))}
            />
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoading && !isBlocked && inputValue.trim()) {
                handleSendMessage();
              }
              return false;
            }} 
            className="flex space-x-2 sm:space-x-3" 
            noValidate
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isBlocked ? "Chat is closed" : (isLoading ? "Archy is thinking..." : "Tell me what's going on.")}
              disabled={isLoading || isBlocked}
              className="flex-1 px-4 py-3 text-base border border-gray-300 bg-[#E8D5C4]/30 text-[#2B2D2F] placeholder-[#6B6B6B] focus:outline-none focus:border-[#C85A3C] focus:ring-2 focus:ring-[#C85A3C]/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoading && !isBlocked && inputValue.trim()) {
                  handleSendMessage();
                }
              }}
              disabled={!inputValue.trim() || isLoading || isBlocked}
              className="bg-[#C85A3C] text-white px-6 py-3 text-base hover:bg-[#B54A32] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:ring-offset-2 min-h-[44px]"
              aria-label="Send message"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}