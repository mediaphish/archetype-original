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

    // Check if message contains escalation keywords
    const escalationKeywords = ['book', 'workshop', 'keynote', 'schedule', 'meeting'];
    const shouldShowEscalation = escalationKeywords.some(keyword => 
      messageText.toLowerCase().includes(keyword)
    );
    
    if (shouldShowEscalation) {
      setShowEscalation(true);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();
      const assistantMessage = { text: data.response, isUser: false };
      setMessages(prev => [...prev, assistantMessage]);
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

  const handleEscalate = async () => {
    try {
      const response = await fetch('/api/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'User requested live handoff',
          timestamp: new Date().toISOString()
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
    <div className="h-screen flex flex-col bg-white">
      <DarkHoursBanner />
      
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Archetype Original</h1>
          <p className="text-sm text-gray-600">How can I help you today?</p>
        </div>

        <QuickPrompts onPromptSelect={handleQuickPrompt} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
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
          <EscalationButton onEscalate={handleEscalate} />
        )}

        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
