// src/app/components/EscalationButton.jsx
import React, { useState } from 'react';

const TRIAGE_QUESTIONS = [
  {
    id: 'outcome',
    question: 'What would success look like in 90 days?',
    placeholder: 'e.g., "Team alignment on Q1 goals"'
  },
  {
    id: 'blocker',
    question: 'What\'s the biggest thing standing in your way?',
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
    question: 'What\'s your timeline and budget for solving this?',
    placeholder: 'e.g., "Need results by March, budget for consulting"'
  }
];

export default function EscalationButton({ onEscalate, conversationHistory = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTriage, setShowTriage] = useState(false);
  const [triageAnswers, setTriageAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const handleStartTriage = () => {
    setShowTriage(true);
    setCurrentQuestion(0);
    setTriageAnswers({});
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
      await onEscalate(triageAnswers, conversationHistory);
    } finally {
      setIsLoading(false);
    }
  };

  if (showTriage) {
    const question = TRIAGE_QUESTIONS[currentQuestion];
    
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <h4 className="font-medium text-green-800 mb-3">
          Question {currentQuestion + 1} of {TRIAGE_QUESTIONS.length}
        </h4>
        <p className="text-sm text-green-700 mb-3">{question.question}</p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder={question.placeholder}
            className="input w-full"
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
              if (input.value.trim()) {
                handleTriageAnswer(input.value);
                input.value = '';
              }
            }}
            className="btn btn-primary bg-green-600 hover:bg-green-700"
          >
            {currentQuestion === TRIAGE_QUESTIONS.length - 1 ? 'Submit Handoff' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
      <button
        onClick={handleStartTriage}
        disabled={isLoading}
        className="w-full btn btn-primary bg-green-600 hover:bg-green-700 disabled:bg-green-400"
      >
        {isLoading ? 'Processing...' : 'Request Live Handoff'}
      </button>
    </div>
  );
}