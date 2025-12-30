/**
 * Journal Email Subscription Form
 * 
 * Allows users to subscribe to email notifications for journal entries and/or devotionals
 */
import React, { useState } from 'react';

export default function JournalSubscription() {
  const [email, setEmail] = useState('');
  const [subscribeJournalEntries, setSubscribeJournalEntries] = useState(true);
  const [subscribeDevotionals, setSubscribeDevotionals] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    // Require at least one subscription type
    if (!subscribeJournalEntries && !subscribeDevotionals) {
      setStatus('error');
      setMessage('Please select at least one subscription type.');
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
        body: JSON.stringify({ 
          email,
          subscribe_journal_entries: subscribeJournalEntries,
          subscribe_devotionals: subscribeDevotionals
        }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Something went wrong. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setStatus('error');
        setMessage(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.ok) {
        setStatus('success');
        const selectedTypes = [];
        if (subscribeJournalEntries) selectedTypes.push('journal entries');
        if (subscribeDevotionals) selectedTypes.push('devotionals');
        setMessage(data.message || `Thanks! You'll receive emails for ${selectedTypes.join(' and ')}.`);
        setEmail('');
        // Keep checkboxes as they were for user convenience
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      // Provide more specific error message based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('Unable to subscribe. Please try again later.');
      }
    }
  };

  return (
    <div className="border border-[#1A1A1A]/10 bg-white p-8 sm:p-10 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4 font-serif tracking-tight">
          Get New Posts by Email
        </h3>
        <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-6 sm:mb-8 text-pretty">
          Subscribe to receive email notifications when new content is published.
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          {/* Subscription Type Checkboxes */}
          <div className="flex flex-col gap-3 text-left">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={subscribeJournalEntries}
                onChange={(e) => setSubscribeJournalEntries(e.target.checked)}
                disabled={status === 'loading'}
                className="mt-1 w-4 h-4 border border-[#1A1A1A]/20 text-[#C85A3C] focus:ring-[#C85A3C] focus:ring-2"
              />
              <span className="text-base sm:text-lg text-[#1A1A1A]">
                Servant Leadership Entries
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={subscribeDevotionals}
                onChange={(e) => setSubscribeDevotionals(e.target.checked)}
                disabled={status === 'loading'}
                className="mt-1 w-4 h-4 border border-[#1A1A1A]/20 text-[#C85A3C] focus:ring-[#C85A3C] focus:ring-2"
              />
              <span className="text-base sm:text-lg text-[#1A1A1A]">
                Servant Leadership Devotional
              </span>
            </label>
          </div>

          {/* Email Input and Submit */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
          </div>
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

