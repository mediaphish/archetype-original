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
  const [typingText, setTypingText] = useState('');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Dramatic delayed greeting sequence with typing animation
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

    // Start typing animation after 3.5 seconds
    const greetingTimer = setTimeout(() => {
      setShowDots(false);
      setShowGreeting(true);
      startTypingAnimation();
    }, 3500);

    return () => {
      clearTimeout(cursorTimer);
      clearTimeout(dotsTimer);
      clearTimeout(greetingTimer);
    };
  }, []);

  const startTypingAnimation = () => {
    const greetingMessages = [
      "Hi, I'm Archy.",
      "I represent the work, philosophy, and experience of Bart Paden — a builder who's spent more than 32 years creating companies, growing people, and learning what makes both endure. Try it. Ask me a question.",
      "How would you like to explore this?"
    ];

    let messageIndex = 0;
    let charIndex = 0;
    let isUser = false;
    let showButtons = false;
    let buttonOptions = [];

    const typeNextChar = () => {
      if (messageIndex < greetingMessages.length) {
        const currentMessage = greetingMessages[messageIndex];
        
        if (charIndex < currentMessage.length) {
          setTypingText(prev => prev + currentMessage[charIndex]);
          charIndex++;
          setTimeout(typeNextChar, 50); // Typing speed
        } else {
          // Message complete, add to messages
          const messageObj = {
            text: currentMessage,
            isUser: isUser,
            showButtons: showButtons,
            buttonOptions: buttonOptions
          };
          
          setMessages(prev => [...prev, messageObj]);
          setTypingText('');
          
          // Move to next message
          messageIndex++;
          charIndex = 0;
          
          // Set properties for next message
          if (messageIndex === 1) {
            isUser = false;
            showButtons = false;
            buttonOptions = [];
          } else if (messageIndex === 2) {
            isUser = false;
            showButtons = true;
            buttonOptions = [
              { text: "Continue with AI conversation", value: "continue_ai" },
              { text: "Go Analog - Browse traditional site", value: "go_analog" }
            ];
          }
          
          // Delay before next message
          setTimeout(typeNextChar, 1000);
        }
      }
    };

    typeNextChar();
  };

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

    // If we're in freeform mode, or if AI keywords are detected, use the API
    const aiKeywords = ['bart', 'who', 'what', 'how', 'why', 'when', 'where', 'tell me', 'explain', 'about', 'archetype original', 'servant leadership', 'philosophy', 'methods'];
    const shouldUseAI = aiKeywords.some(keyword => 
      messageText.toLowerCase().includes(keyword)
    );

    if (conversationState === 'freeform' || shouldUseAI) {
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
    } else {
      // Handle structured conversation
      handleStructuredResponse(messageText);
    }
  };

  const handleStructuredResponse = (messageText) => {
    // Check if this should be handled by AI instead of structured flow
    const aiKeywords = ['bart', 'who', 'what', 'how', 'why', 'when', 'where', 'tell me', 'explain', 'about', 'archetype original', 'servant leadership', 'philosophy', 'methods'];
    const shouldUseAI = aiKeywords.some(keyword => 
      messageText.toLowerCase().includes(keyword)
    );

    if (shouldUseAI) {
      // Switch to AI mode for this response
      setConversationState('freeform');
      
      // Send to AI API
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageText,
          conversationHistory,
          sessionId
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const assistantMessage = { text: data.response, isUser: false };
        setMessages(prev => [...prev, assistantMessage]);

        if (data.shouldEscalate) {
          setShowEscalation(true);
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        const errorMessage = { 
          text: 'Sorry, I encountered an error. Please try again.', 
          isUser: false 
        };
        setMessages(prev => [...prev, errorMessage]);
      });
      
      return;
    }

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
    } else if (conversationState === 'clarity_options') {
      if (messageText.includes('learn about clarity mentoring') || messageText.includes('how')) {
        response = {
          text: "Clarity mentoring helps you cut through the noise, define your next steps, and root your decisions in logic, not hype. It's about rediscovering your purpose and rebuilding confidence after big transitions.\n\nWould you like to explore some resources or schedule a session?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Explore resources", value: "clarity_resources" },
            { text: "Schedule a clarity session", value: "schedule_clarity" }
          ]
        };
        nextState = 'clarity_deep';
      } else if (messageText.includes('schedule')) {
        response = {
          text: "Excellent. I'll connect you with Bart's calendar for a clarity session.",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Open Calendly", value: "calendly_clarity" }
          ]
        };
        nextState = 'scheduling';
      }
    } else if (conversationState === 'learn_options') {
      if (messageText.includes('read more of his story') || messageText.includes('story')) {
        response = {
          text: "Bart's journey spans over three decades, from design to entrepreneurship, building and leading teams across various industries. He's seen what works and what doesn't, distilling that into the Archetype Original philosophy.\n\nWould you like to dive deeper into specific aspects of his experience or see how he applies it?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "See how he helps", value: "help" },
            { text: "Show me content", value: "show_content" }
          ]
        };
        nextState = 'story_deep';
      } else if (messageText.includes('see how he helps') || messageText.includes('help')) {
        response = {
          text: "Bart helps leaders and builders through consulting, mentorship, and speaking engagements, all focused on clarity, culture, and compounding performance. He provides practical frameworks and direct guidance.\n\nWould you like to explore specific services or connect with him?",
          isUser: false,
          showButtons: true,
          buttonOptions: [
            { text: "Explore services", value: "explore_services" },
            { text: "Connect with Bart", value: "schedule_learn" }
          ]
        };
        nextState = 'help_deep';
      }
    } else if (conversationState === 'consulting_deep' && messageText.includes('examples')) {
      response = {
        text: "Bart's consulting work has helped companies achieve significant growth, improve team alignment, and build resilient systems. Examples include streamlining operations for a tech startup, rebuilding communication for a mid-sized firm, and developing leadership pipelines for established organizations.\n\nWould you like to schedule a call to discuss your specific needs?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Schedule with Bart", value: "schedule_business" }
        ]
      };
      nextState = 'final_cta';
    } else if (conversationState === 'principles_deep' && messageText.includes('apply them')) {
      response = {
        text: "Applying these principles starts with a clear assessment of your current situation. Which of the five fundamentals feels most relevant to your immediate challenge?\n\n• Clarity Beats Chaos\n• Protect the Culture\n• Build Trust Daily\n• Empower Over Control\n• Serve the Standard",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Clarity Beats Chaos", value: "apply_clarity" },
          { text: "Protect the Culture", value: "apply_culture" },
          { text: "Build Trust Daily", value: "apply_trust" },
          { text: "Empower Over Control", value: "apply_empower" },
          { text: "Serve the Standard", value: "apply_serve" },
          { text: "Schedule mentorship", value: "schedule_mentorship" }
        ]
      };
      nextState = 'apply_principles_deep';
    } else if (conversationState === 'apply_principles_deep') {
      response = {
        text: `Let's dive into "${messageText}". What's the specific challenge you're facing related to this principle, and what small step could you take this week to address it?`,
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Schedule mentorship", value: "schedule_mentorship" }
        ]
      };
      nextState = 'freeform'; // Transition to freeform after discussing a principle
    } else if (conversationState === 'clarity_deep' && messageText.includes('explore resources')) {
      response = {
        text: "Here are some resources on gaining clarity: [Link to a relevant blog post or resource].\n\nWould you like to schedule a session to discuss your personal journey?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Schedule a clarity session", value: "schedule_clarity" }
        ]
      };
      nextState = 'final_cta';
    } else if (conversationState === 'story_deep' && messageText.includes('show me content')) {
      response = {
        text: "You can find more of Bart's insights and stories in the Archetype Original Journal: [Link to Journal].\n\nWould you like to connect with Bart directly?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Yes, connect me", value: "schedule_learn" },
          { text: "Not yet", value: "not_yet" }
        ]
      };
      nextState = 'final_cta';
    } else if (conversationState === 'help_deep' && messageText.includes('explore services')) {
      response = {
        text: "Bart offers tailored consulting engagements, one-on-one mentorship, and dynamic speaking events. Each is designed to provide actionable insights and lasting impact.\n\nWhich service interests you most?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Business Consulting", value: "building" },
          { text: "Leadership Mentorship", value: "leading" },
          { text: "Clarity Sessions", value: "clarity" },
          { text: "Speaking Engagements", value: "schedule_learn" }
        ]
      };
      nextState = 'path_selection'; // Loop back to main paths
    } else if (messageText.includes('schedule') || messageText.includes('calendly')) {
      // Universal Calendly handling
      response = {
        text: "Opening Calendly to schedule your session.",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Open Calendly", value: "calendly_universal" }
        ]
      };
      nextState = 'scheduling';
    } else if (messageText.includes('yes, connect me')) {
      response = {
        text: "Excellent. Opening Calendly to connect you with Bart.",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Open Calendly", value: "calendly_universal" }
        ]
      };
      nextState = 'scheduling';
    } else if (messageText.includes('not yet')) {
      response = {
        text: "No problem at all. Here's a short leadership resource you might find helpful: [Link to a relevant leadership resource/post].\n\nIs there anything else I can help you explore?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Show me more content", value: "show_content" },
          { text: "Start over", value: "start_over" }
        ]
      };
      nextState = 'freeform';
    } else if (messageText.includes('show me more content')) {
      response = {
        text: "You can find more insights in the Archetype Original Journal: [Link to Journal].\n\nWhat else can I help you with?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "Start over", value: "start_over" }
        ]
      };
      nextState = 'freeform';
    } else if (messageText.includes('start over')) {
      setMessages([]); // Clear messages to restart
      setConversationState('greeting');
      return; // Exit to let the initial useEffect re-run
    }

    if (response) {
      setMessages(prev => [...prev, response]);
      setConversationState(nextState);
    } else {
      // Fall back to freeform if we don't recognize the structured response
      setConversationState('freeform');
      const fallbackResponse = {
        text: "That doesn't fit neatly into one of my usual paths, and that's okay. Tell me more about what's happening, and I'll find the best way to help.",
        isUser: false,
        showButtons: false
      };
      setMessages(prev => [...prev, fallbackResponse]);
    }
  };

  const handleButtonClick = (value) => {
    if (value === 'continue_ai') {
      // Continue with AI conversation - show path selection
      const userMessage = { text: "Continue with AI conversation", isUser: true };
      setMessages(prev => [...prev, userMessage]);
      
      const response = {
        text: "Where are you in your own journey right now?",
        isUser: false,
        showButtons: true,
        buttonOptions: [
          { text: "I'm building or leading a company", value: "building" },
          { text: "I'm stepping into leadership", value: "leading" },
          { text: "I want personal or professional clarity", value: "clarity" },
          { text: "I just want to learn more about Bart", value: "learn" }
        ]
      };
      setMessages(prev => [...prev, response]);
      setConversationState('path_selection');
    } else if (value === 'go_analog') {
      // Go Analog - scroll to traditional site sections
      const userMessage = { text: "Go Analog - Browse traditional site", isUser: true };
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
    } else if (value.startsWith('calendly_')) {
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
          { text: "Open Calendly", value: "calendly_universal" }
        ]
      };
      setMessages(prev => [...prev, response]);
      setConversationState('scheduling');
    } else {
      // Default to structured response for other buttons
      handleStructuredResponse(value);
    }
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
    <div className="py-4 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <DarkHoursBanner />

        <div className="text-center mb-6">
          {/* Loading Animation */}
          {messages.length === 0 && !showGreeting && (
            <div className="mb-6">
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

          {/* Typing Animation */}
          {typingText && (
            <div className="mb-6">
              <div className="inline-block bg-white border-2 border-black px-6 py-4 rounded-2xl shadow-lg animate-bounce">
                <p className="text-xl text-black whitespace-pre-wrap">
                  {typingText}
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-8 max-w-2xl mx-auto">
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
              className="flex-1 px-6 py-4 text-xl border-2 border-black bg-white text-black placeholder-gray-500 focus:outline-none focus:border-gray-400 rounded-xl"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="bg-black text-white px-8 py-4 text-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-xl"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}