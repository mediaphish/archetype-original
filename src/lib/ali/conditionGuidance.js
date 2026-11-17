/**
 * ALI results screen: one practical step and one conversation starter per condition.
 *
 * Static copy, shown in the "One focus for this round" card. Definitions come from
 * lib/ali-conditions.js (the approved wording); this file only adds what to do next.
 *
 * Voice rules: direct, warm, practical. No em dashes. Never preachy.
 *
 * journal: Bart's post on the condition, when one exists. Older posts were written
 * under the earlier names (Communication now maps to Voice, Stability to Support).
 *
 * TODO: Accountability and Growth have no ALI series post yet. Add the journal
 * path here once Bart publishes one; the screen shows no link until then.
 */

import { CONDITION_KEYS } from '../../../lib/ali-conditions.js';

export const CONDITION_GUIDANCE = Object.freeze({
  clarity: {
    tryThis:
      'Pick the two things that matter most this month and say them out loud in your next team meeting. Then ask each person what those two things mean for their own work.',
    sayThis: '"If you had to guess what I care about most right now, what would you say?"',
    journal: '/journal/ali-series-clarity-what-actually-lands',
  },
  consistency: {
    tryThis:
      'Write down every promise you make to your team this week, even the small ones. On Friday, close each one out or tell the person plainly why it moved.',
    sayThis: '"Is there something I said I would do that never happened? I would rather hear it from you than keep missing it."',
    journal: '/journal/ali-series-consistency-the-leader-people-learn-to-predict',
  },
  accountability: {
    tryThis:
      'Name one standard you have let slide and address it this week, directly and kindly, with the person involved. Start by owning any part you played in letting it slide.',
    sayThis: '"I have let this go longer than I should have. That is on me. Here is what I need from here on."',
    journal: null,
  },
  voice: {
    tryThis:
      'Ask for bad news on purpose this week, then thank the person who brings it before you respond to the problem. How you react the first time decides whether there is a second time.',
    sayThis: '"What is something you think I do not want to hear? I am asking because I need to hear it."',
    journal: '/journal/ali-series-communication-the-message-that-actually-arrives',
  },
  growth: {
    tryThis:
      'Hand one real decision to someone on your team this week and let it stand, even if you would have made it differently. Afterward, talk through what they learned.',
    sayThis: '"What is one thing you want to get better at this year, and how can I help you get there?"',
    journal: null,
  },
  support: {
    tryThis:
      'Look at who is carrying the most weight right now and take one thing off their plate this week. Do not wait for them to ask.',
    sayThis: '"How is your load right now, honestly? What is one thing I could move or take off your plate?"',
    journal: '/journal/ali-series-stability-the-environment-that-holds',
  },
  alignment: {
    tryThis:
      'Before your next decision, tell the team why you are making it and what you are giving up to make it. People pull together when they can see the tradeoff.',
    sayThis: '"Where does your work feel disconnected from where we are headed? Tell me where it does not add up."',
    journal: '/journal/ali-series-alignment-when-the-direction-actually-holds',
  },
});

/** Guidance for one condition, or null. */
export function guidanceFor(key) {
  return CONDITION_KEYS.includes(key) ? CONDITION_GUIDANCE[key] : null;
}
