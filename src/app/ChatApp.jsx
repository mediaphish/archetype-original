// src/app/ChatApp.jsx
import React, { useState, useRef, useEffect } from 'react';
import DarkHoursBanner from './components/DarkHoursBanner.jsx';
import QuickPrompts from './components/QuickPrompts.jsx';
import MessageBubble from './components/MessageBubble.jsx';
import EscalationButton from './components/EscalationButton.jsx';

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      // Build conversation history for context
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
          conversationHistory 
        }),
      });

      const data = await response.json();
      const assistantMessage = { text: data.response, isUser: false };
      setMessages(prev => [...prev, assistantMessage]);

      // Show escalation button if triggered
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

            <QuickPrompts onPromptSelect={handleQuickPrompt} />

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