// src/app/components/QuickPrompts.jsx
import React from 'react';

const QUICK_PROMPTS = [
  {
    id: 'business-growth',
    label: 'Business & growth consulting',
    prompt: 'I need help with business strategy and growth planning.'
  },
  {
    id: 'leadership-culture',
    label: 'Leadership & team culture',
    prompt: 'I want to improve my leadership skills and team culture.'
  },
  {
    id: 'mentorship-clarity',
    label: 'Mentorship & personal clarity',
    prompt: 'I need mentorship and help finding personal clarity.'
  },
  {
    id: 'learn-about-bart',
    label: 'Learn about Bart',
    prompt: 'Tell me about Bart Paden and his background.'
  }
];

export default function QuickPrompts({ onPromptSelect }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Quick prompts:</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptSelect(prompt.prompt)}
            className="btn text-left justify-start"
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
}