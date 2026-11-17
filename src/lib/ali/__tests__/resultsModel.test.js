import {
  bandFor,
  buildHeadline,
  pickFocus,
  driftText,
  hasDrift,
  mirrorRows,
  directionText,
  patternCards,
  roundStatusLine,
  answeredText,
  screenState,
  sortedByTeam,
} from '../resultsModel';
import { CONDITION_GUIDANCE, guidanceFor } from '../conditionGuidance';
import { CONDITION_KEYS } from '../../../../lib/ali-conditions.js';

const c = (key, label, team, leader = null) => ({ key, label, team, leader });

describe('bandFor', () => {
  it('reads Strong at 75 and up', () => {
    expect(bandFor(75).label).toBe('Strong');
    expect(bandFor(100).label).toBe('Strong');
  });
  it('reads Mixed from 55 to 74', () => {
    expect(bandFor(55).label).toBe('Mixed');
    expect(bandFor(74).label).toBe('Mixed');
  });
  it('reads Weak below 55', () => {
    expect(bandFor(54).label).toBe('Weak');
    expect(bandFor(0).label).toBe('Weak');
  });
  it('returns null for a missing score', () => {
    expect(bandFor(null)).toBeNull();
    expect(bandFor(undefined)).toBeNull();
  });
});

describe('buildHeadline', () => {
  it('names the strongest condition and the biggest leader-over-team gap', () => {
    const h = buildHeadline([c('clarity', 'Clarity', 80, 82), c('voice', 'Voice', 50, 80), c('growth', 'Growth', 60, 65)]);
    expect(h).toBe('Your team sees Clarity as your strongest condition. You rate Voice 30 points higher than they do.');
  });
  it('says when the team rates something higher than the leader', () => {
    const h = buildHeadline([c('clarity', 'Clarity', 80, 78), c('support', 'Support', 70, 50)]);
    expect(h).toBe('Your team sees Clarity as your strongest condition. Your team rates Support 20 points higher than you do.');
  });
  it('says they agree when every gap is small', () => {
    const h = buildHeadline([c('clarity', 'Clarity', 80, 85), c('voice', 'Voice', 60, 55)]);
    expect(h).toMatch(/about the same way/);
  });
  it('works without the leader', () => {
    const h = buildHeadline([c('clarity', 'Clarity', 80), c('voice', 'Voice', 40)]);
    expect(h).toBe('Your team sees Clarity as your strongest condition. Voice is where they see the most room to grow.');
  });
  it('is empty with no data', () => {
    expect(buildHeadline([])).toBe('');
    expect(buildHeadline(null)).toBe('');
  });
});

describe('pickFocus', () => {
  it('picks the lowest team score', () => {
    expect(pickFocus([c('clarity', 'Clarity', 70), c('voice', 'Voice', 40), c('growth', 'Growth', 60)])).toBe('voice');
  });
  it('breaks ties by the largest leader-over-team gap', () => {
    expect(
      pickFocus([c('clarity', 'Clarity', 50, 60), c('voice', 'Voice', 50, 85), c('growth', 'Growth', 50, 40)])
    ).toBe('voice');
  });
  it('prefers a known gap over a missing leader score on a tie', () => {
    expect(pickFocus([c('clarity', 'Clarity', 50), c('voice', 'Voice', 50, 45)])).toBe('voice');
  });
  it('falls back to the approved order on a full tie', () => {
    expect(pickFocus([c('voice', 'Voice', 50), c('clarity', 'Clarity', 50)])).toBe('clarity');
  });
  it('returns null with no scores', () => {
    expect(pickFocus([])).toBeNull();
    expect(pickFocus([c('clarity', 'Clarity', null)])).toBeNull();
  });
});

describe('mirror rows', () => {
  it('keeps the approved order and hides the leader when missing', () => {
    const rows = mirrorRows([c('voice', 'Voice', 50), c('clarity', 'Clarity', 70)], null, ['clarity', 'voice']);
    expect(rows.map((r) => r.key)).toEqual(['clarity', 'voice']);
    expect(rows[0].leader).toBeNull();
    expect(rows[0].direction).toBeNull();
  });
  it('uses direction words', () => {
    const rows = mirrorRows([c('voice', 'Voice', 50, 80)], null, ['voice']);
    expect(rows[0].gap).toBe(30);
    expect(directionText(rows[0].direction)).toBe('You rate this higher than your team');
    expect(directionText('in_agreement')).toBe('You and your team agree');
    expect(directionText('leader_lower')).toBe('Your team rates this higher');
  });
  it('sorts bars strongest first', () => {
    expect(sortedByTeam([c('clarity', 'Clarity', 50), c('voice', 'Voice', 70)]).map((r) => r.key)).toEqual(['voice', 'clarity']);
  });
});

describe('drift and labels', () => {
  it('puts change into words', () => {
    expect(driftText(6)).toBe('up 6 since last round');
    expect(driftText(-4)).toBe('down 4 since last round');
    expect(driftText(0)).toBe('no change since last round');
    expect(driftText(null)).toBe('');
  });
  it('knows when there is change to show', () => {
    expect(hasDrift(null)).toBe(false);
    expect(hasDrift([{ key: 'clarity', change: null }])).toBe(false);
    expect(hasDrift([{ key: 'clarity', change: 3 }])).toBe(true);
  });
  it('writes the round line', () => {
    expect(roundStatusLine({ number: 2, status: 'open', closesAt: '2026-12-04' })).toBe('Round 2 · closes Friday, Dec 4');
    expect(roundStatusLine({ number: 1, status: 'closed', closesAt: '2026-11-30' })).toBe('Round 1 closed Nov 30');
  });
  it('counts answers without naming anyone', () => {
    expect(answeredText(1)).toBe('1 team member answered');
    expect(answeredText(7)).toBe('7 team members answered');
  });
  it('maps patterns to plain names', () => {
    const cards = patternCards([{ key: 'filtered_picture' }, { key: 'care_avoids_hard_things' }]);
    expect(cards.map((p) => p.title)).toEqual([
      'You may be working from a filtered picture',
      'Care that avoids hard conversations',
    ]);
  });
  it('picks the screen state', () => {
    expect(screenState(null)).toBe('error');
    expect(screenState({ reason: 'no_rounds', rounds: [] })).toBe('welcome');
    expect(screenState({ ready: false, reason: 'round_open', round: { number: 1 } })).toBe('waiting');
    expect(screenState({ ready: true, round: { number: 1 } })).toBe('ready');
  });
});

describe('condition guidance', () => {
  it('covers all seven conditions with copy and no em dashes', () => {
    for (const key of CONDITION_KEYS) {
      const g = guidanceFor(key);
      expect(g).toBeTruthy();
      expect(g.tryThis.length).toBeGreaterThan(20);
      expect(g.sayThis.length).toBeGreaterThan(10);
      expect(g.tryThis + g.sayThis).not.toMatch(/—/);
    }
    expect(Object.keys(CONDITION_GUIDANCE).sort()).toEqual([...CONDITION_KEYS].sort());
  });
  it('links only where a post exists', () => {
    expect(guidanceFor('accountability').journal).toBeNull();
    expect(guidanceFor('growth').journal).toBeNull();
    expect(guidanceFor('voice').journal).toBe('/journal/ali-series-communication-the-message-that-actually-arrives');
  });
});
