/**
 * Quick prompt chips for PUBLIC marketing Archy (route context keys from FloatingArchyButton).
 * `send` is the text submitted as the user message (conversation stays primary vs. buttons-only).
 */

export function getQuickPromptsForContext(context) {
  const map = ARCHY_QUICK_PROMPTS[context] ?? ARCHY_QUICK_PROMPTS.default;
  return map;
}

const ARCHY_QUICK_PROMPTS = {
  home: [
    { label: 'What does Archetype Original do?', send: 'What does Archetype Original do?' },
    { label: 'Servant leadership basics', send: 'Explain servant leadership in practical terms.' },
    { label: 'How Bart helps leaders', send: 'How does Bart typically work with leaders and teams?' },
    { label: 'Culture & clarity', send: 'How do you approach culture and organizational clarity?' },
  ],
  journal: [
    { label: 'Pick an idea from the journal', send: 'I’m reading the journal — what should I reflect on first?' },
    { label: 'Apply this to my team', send: 'How would I apply these ideas with my team this week?' },
    { label: 'Go deeper on one theme', send: 'What themes show up across Bart’s writing?' },
  ],
  faith: [
    { label: 'Today’s devotional idea', send: 'Help me engage with today’s devotional in a practical way.' },
    { label: 'Prayer & reflection', send: 'Suggest a short reflection prompt based on what I’m reading.' },
    { label: 'Living this out', send: 'How might I live this out at work and at home this week?' },
  ],
  'culture-science': [
    { label: 'What is Culture Science?', send: 'What is Culture Science in plain language?' },
    { label: 'The seven conditions', send: 'Explain the leadership conditions Culture Science measures.' },
    { label: 'How ALI fits', send: 'How does ALI relate to Culture Science?' },
    { label: 'Why measure conditions?', send: 'Why measure leadership conditions instead of only engagement?' },
  ],
  archy: [
    { label: 'How you work', send: 'How do you work as Archy — what can you help with?' },
    { label: 'What you know about Bart', send: 'What sources and perspective do you draw from?' },
    { label: 'Limits & ethics', send: 'What won’t you do or claim?' },
  ],
  'engagement-inquiry': [
    { label: 'What happens after I inquire?', send: 'What happens after I submit this kind of inquiry?' },
    { label: 'Fit & timing', send: 'How do you think about fit and timing for an engagement?' },
    { label: 'What to prepare', send: 'What should I have ready before a first conversation?' },
  ],
  contact: [
    { label: 'Working with Bart', send: 'What’s the best way to explore working with Bart?' },
    { label: 'Consulting vs mentorship', send: 'How does consulting differ from mentorship here?' },
    { label: 'Next step for me', send: 'What’s a sensible next step for my situation?' },
  ],
  about: [
    { label: "Bart’s background", send: 'Summarize Bart’s background and how he works with leaders.' },
    { label: 'What makes this different', send: 'What distinguishes this approach from typical leadership advice?' },
    { label: 'Fit for my stage', send: 'How do I know if this is a fit for where I lead today?' },
  ],
  methods: [
    { label: 'Overview of Methods', send: 'Give me an overview of Methods — mentoring, consulting, fractional.' },
    { label: 'Which path might fit?', send: 'How do I think about which Method might fit my situation?' },
    { label: 'What engagement looks like', send: 'What does an engagement typically look like?' },
  ],
  'methods-mentorship': [
    { label: 'How mentorship works', send: 'How does mentorship work in practice?' },
    { label: 'Who it’s for', send: 'Who is mentorship best suited for?' },
    { label: 'What to expect', send: 'What should I expect from the process?' },
  ],
  'methods-consulting': [
    { label: 'Types of consulting help', send: 'What kinds of consulting help do you provide?' },
    { label: 'Engagement shape', send: 'What does a consulting engagement usually look like?' },
    { label: 'When to choose this', send: 'When is consulting the right choice vs mentorship?' },
  ],
  'methods-fractional-roles': [
    { label: 'Fractional roles explained', send: 'Explain fractional leadership and when it helps.' },
    { label: 'Roles available', send: 'What fractional roles are in scope?' },
    { label: 'How to start', send: 'How do leaders usually get started with a fractional role?' },
  ],
  'methods-fractional-cco': [
    { label: 'Fractional CCO scope', send: 'What does a fractional CCO do in this practice?' },
    { label: 'Signals you need one', send: 'What signals suggest a fractional CCO might help?' },
    { label: 'How engagements run', send: 'How do fractional CCO engagements typically run?' },
  ],
  advisory: [
    { label: 'The Room (the book)', send: 'What is The Room about in one clear summary?' },
    { label: 'Private advisory', send: 'How does private advisory outside the organization work?' },
    { label: 'Is it a fit for me?', send: 'How would I know if advisory is a fit?' },
  ],
  'remaining-human': [
    { label: 'Core argument', send: 'What is the core argument of Remaining Human?' },
    { label: 'Pressure & speed', send: 'How should I think about leading when speed and pressure pile up?' },
    { label: 'AI-shaped systems', send: 'What does “AI-shaped systems” mean for leaders here?' },
  ],
  default: [
    { label: 'Leadership question', send: 'I have a leadership challenge — can you help me think it through?' },
    { label: 'Culture & clarity', send: 'How do you think about culture and clarity in organizations?' },
    { label: 'Work with Bart', send: 'How could someone explore working with Bart?' },
    { label: 'Tell me about Bart', send: 'Tell me about Bart’s background and approach.' },
  ],
};
