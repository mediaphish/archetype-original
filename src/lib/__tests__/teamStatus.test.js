import { idleStatus } from '../teamStatus.js';

describe('idleStatus', () => {
  it('says who is waiting on Bart when a teammate spoke last', () => {
    expect(idleStatus([
      { role: 'user', content: 'Fix that line.' },
      { role: 'assistant', content: 'Jot: Does that match?', meta: { agent: 'jot' } },
      { role: 'user', content: '[TEAM] Red, add your part.', meta: { team_note: true } },
      { role: 'assistant', content: 'Red: Agreed.', meta: { agent: 'editor' } },
    ])).toBe('Nobody is working right now. Red is waiting on your reply.');
  });

  it('skips team notes and system rows to find the last real message', () => {
    expect(idleStatus([
      { role: 'assistant', content: 'Ready.', meta: { agent: 'jot' } },
      { role: 'user', content: '[TEAM] Huddle done.' },
      { role: 'system', content: 'note' },
    ])).toBe('Nobody is working right now. Jot is waiting on your reply.');
  });

  it('says so when Bart spoke last and nothing answered', () => {
    expect(idleStatus([{ role: 'user', content: 'Hello?' }])).toMatch(/no reply yet/);
  });

  it('says nothing in an empty conversation', () => {
    expect(idleStatus([])).toBeNull();
    expect(idleStatus(null)).toBeNull();
  });
});
