/**
 * Journal Email Subscription Form
 * 
 * Allows users to subscribe to email notifications when new journal posts are published
 */
import React, { useState } from 'react';

export default function JournalSubscription() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/journal/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setStatus('success');
        setMessage('Thanks! You\'ll receive an email when new posts are published.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Unable to subscribe. Please try again later.');
    }
  };

  return (
    <div className="border border-[#1A1A1A]/10 bg-white p-8 sm:p-10 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
          Get New Posts by Email
        </h3>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
          Subscribe to receive an email notification whenever a new journal post is published.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="flex-1 px-4 py-3 border border-[#1A1A1A]/20 text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C85A3C] transition-colors"
            disabled={status === 'loading'}
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-[#1A1A1A] text-white px-6 sm:px-8 py-3 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-sm sm:text-base ${
            status === 'success' ? 'text-[#1A1A1A]' : 'text-[#C85A3C]'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

