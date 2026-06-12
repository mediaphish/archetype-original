/**
 * Journal Email Subscription Form
 * 
 * Allows users to subscribe to email notifications for journal entries and/or devotionals
 */
import React, { useState } from 'react';

export default function JournalSubscription({
  title = 'Get New Posts by Email',
  description = 'Subscribe to receive email notifications when new content is published.',
  podcastMode = false,
}) {
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

    // Require at least one subscription type (podcast page uses journal entries for episode alerts)
    if (!podcastMode && !subscribeJournalEntries && !subscribeDevotionals) {
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
          subscribe_journal_entries: podcastMode ? true : subscribeJournalEntries,
          subscribe_devotionals: podcastMode ? false : subscribeDevotionals,
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
    <div className="border border-[#1A1A1A]/10 bg-white px-6 sm:px-12 py-10 sm:py-14 text-center">
      <div className="max-w-2xl mx-auto">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 tracking-tight">
          {title}
        </h3>
        <p className="text-[#6B6B6B] mb-6 max-w-md mx-auto text-pretty">{description}</p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          {!podcastMode && (
            <div className="flex flex-col gap-3 text-left">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscribeJournalEntries}
                  onChange={(e) => setSubscribeJournalEntries(e.target.checked)}
                  disabled={status === 'loading'}
                  className="mt-1 w-4 h-4 border border-[#1A1A1A]/20 text-[#DB0812] focus:ring-[#DB0812] focus:ring-2"
                />
                <span className="text-base sm:text-lg text-[#1A1A1A]">Servant Leadership Entries</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscribeDevotionals}
                  onChange={(e) => setSubscribeDevotionals(e.target.checked)}
                  disabled={status === 'loading'}
                  className="mt-1 w-4 h-4 border border-[#1A1A1A]/20 text-[#DB0812] focus:ring-[#DB0812] focus:ring-2"
                />
                <span className="text-base sm:text-lg text-[#1A1A1A]">Servant Leadership Devotional</span>
              </label>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="flex-1 px-4 py-3 border border-[#1A1A1A]/15 text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#DB0812] transition-colors"
              disabled={status === 'loading'}
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="min-h-[44px] bg-[#1A1A1A] text-white px-6 py-3 text-sm font-medium hover:bg-[#DB0812] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 text-sm sm:text-base ${
            status === 'success' ? 'text-[#1A1A1A]' : 'text-[#DB0812]'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

