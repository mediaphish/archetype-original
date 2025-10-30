// src/app/components/EscalationButton.jsx
import React, { useState } from 'react';

// Check if we're in dark hours (6 PM - 10 AM CST, including weekends)
const isDarkHours = () => {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const hour = cstTime.getHours();
  const dayOfWeek = cstTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return isWeekend || hour >= 18 || hour < 10;
};

const TRIAGE_QUESTIONS = [
  {
    id: 'outcome',
    question: 'What would success look like in 90 days?',
    placeholder: 'e.g., "Team alignment on Q1 goals"'
  },
  {
    id: 'blocker',
    question: "What's the biggest thing standing in your way?",
    placeholder: 'e.g., "Communication breakdown between departments"'
  },
  {
    id: 'roles',
    question: 'Who else is involved in this situation?',
    placeholder: 'e.g., "My direct reports, the board, our clients"'
  },
  {
    id: 'good_looks_like',
    question: 'What does "good" look like when this is resolved?',
    placeholder: 'e.g., "Clear processes, motivated team, hitting targets"'
  },
  {
    id: 'window_budget',
    question: "What's your timeline and budget for solving this?",
    placeholder: 'e.g., "Need results by March, budget for consulting"'
  }
];

export default function EscalationButton({ onEscalate, conversationHistory = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTriage, setShowTriage] = useState(false);
  const [triageAnswers, setTriageAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Contact capture state
  const [collectContact, setCollectContact] = useState(false);
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_contact: '', // 'email' | 'phone'
    preferred_time: ''
  });
  const [contactErrors, setContactErrors] = useState({});

  const handleStartTriage = () => {
    setShowTriage(true);
    setCollectContact(true);
    setCurrentQuestion(0);
    setTriageAnswers({});
  };

  const validateContact = () => {
    const errors = {};
    if (!contact.name.trim()) errors.name = 'Name is required';
    if (!contact.email.trim()) errors.email = 'Email is required';
    // Minimal email shape check
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = 'Enter a valid email';
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContactContinue = () => {
    if (!validateContact()) return;
    setCollectContact(false);
  };

  const handleTriageAnswer = (answer) => {
    const questionId = TRIAGE_QUESTIONS[currentQuestion].id;
    setTriageAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    if (currentQuestion < TRIAGE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleEscalate();
    }
  };

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      // Merge contact into triage payload
      const merged = { ...triageAnswers, ...contact };
      await onEscalate(merged, conversationHistory);
    } finally {
      setIsLoading(false);
    }
  };

  if (showTriage) {
    const darkHours = isDarkHours();

    // Contact capture screen
    if (collectContact) {
      return (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h4 className="text-lg font-medium text-gray-800 mb-3">How can Bart reach you?</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 text-base border ${contactErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:border-gray-500`}
                placeholder="Your full name"
              />
              {contactErrors.name && <p className="text-sm text-red-600 mt-1">{contactErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 text-base border ${contactErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:border-gray-500`}
                placeholder="you@example.com"
              />
              {contactErrors.email && <p className="text-sm text-red-600 mt-1">{contactErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Preferred contact</label>
                <select
                  value={contact.preferred_contact}
                  onChange={(e) => setContact(prev => ({ ...prev, preferred_contact: e.target.value }))}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                >
                  <option value="">No preference</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Preferred time</label>
                <input
                  type="text"
                  value={contact.preferred_time}
                  onChange={(e) => setContact(prev => ({ ...prev, preferred_time: e.target.value }))}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                  placeholder="e.g., Afternoons, CST"
                />
              </div>
            </div>

            {darkHours && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Bart's office is closed</strong> (6 PM - 10 AM CST). I'll queue your request and he'll follow up when he's back.
                </p>
              </div>
            )}

            <button
              onClick={handleContactContinue}
              className="w-full bg-gray-700 text-white px-4 py-2 text-base hover:bg-gray-800 transition-colors rounded-lg"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    // Triage Q&A screen
    const question = TRIAGE_QUESTIONS[currentQuestion];
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
        <h4 className="text-lg font-medium text-gray-800 mb-3">
          Question {currentQuestion + 1} of {TRIAGE_QUESTIONS.length}
        </h4>
        <p className="text-base text-gray-700 mb-3">{question.question}</p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder={question.placeholder}
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleTriageAnswer(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input');
              if (input && input.value.trim()) {
                handleTriageAnswer(input.value);
                input.value = '';
              }
            }}
            className="w-full bg-gray-700 text-white px-4 py-2 text-base hover:bg-gray-800 transition-colors rounded-lg"
          >
            {currentQuestion === TRIAGE_QUESTIONS.length - 1 ? (darkHours ? 'Queue for Bart' : 'Submit Handoff') : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  const darkHours = isDarkHours();

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
      {darkHours && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Bart's office is closed</strong> (6 PM - 10 AM CST). I'll queue your request for him to review when he's back.
          </p>
        </div>
      )}
      <button
        onClick={handleStartTriage}
        disabled={isLoading}
        className="w-full bg-gray-700 text-white px-4 py-2 text-base hover:bg-gray-800 disabled:bg-gray-400 transition-colors rounded-lg"
      >
        {isLoading ? 'Processing...' : darkHours ? 'Queue for Bart' : 'Request Live Handoff'}
      </button>
    </div>
  );
}
