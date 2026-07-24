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
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Quick prompts:</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptSelect(prompt.prompt)}
            className="px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors duration-200"
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
