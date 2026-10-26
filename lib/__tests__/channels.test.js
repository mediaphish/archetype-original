/**
 * @jest-environment node
 *
 * Auto as Bart's Slack with his team, Phase 1 (2026-10-26): channels, the
 * whole team in every thread, and teammates who speak up only with something
 * real to add.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { channelOfThread, channelKey, STANDING_CHANNELS, FIRST_PROJECTS } from '../ao/team/channels.js';
import { pickSpeakers, lastExchange, speakUpPrompt, speakUpMessage, MAX_SPEAKERS } from '../ao/team/speakUp.js';
import { mentionedAgents } from '../ao/team/agents.js';
import * as browserChannels from '../../src/lib/channels.js';
import * as browserSpeakUp from '../../src/lib/speakUpMessage.js';
import * as browserMentions from '../../src/lib/teamMentions.js';

describe('channels', () => {
  test('the standing channels and the four first projects Bart named', () => {
    expect(STANDING_CHANNELS.map((c) => c.key)).toEqual(['general', 'today', 'social', 'writing', 'podcast', 'crm', 'team']);
    expect(FIRST_PROJECTS.map((c) => c.name)).toEqual(['AI & Leadership', 'Next Biblical Archetype', 'Automated posts', 'Podcast next steps']);
    // Each channel is led by the teammate whose area it is.
    expect(Object.fromEntries(STANDING_CHANNELS.map((c) => [c.key, c.lead]))).toMatchObject({ social: 'reach', writing: 'jot', podcast: 'producer', general: 'auto' });
  });
  test('older threads land in a channel without being moved', () => {
    expect(channelOfThread({ state: { channel: 'social' } })).toBe('social');
    expect(channelOfThread({ state: { crm_ask: true } })).toBe('crm');
    expect(channelOfThread({ state: { task_id: 't', agent: 'jot' } })).toBe('team');
    expect(channelOfThread({ state: { agent: 'reach' } })).toBe('team');
    expect(channelOfThread({ state: {} })).toBe('general');
    expect(channelOfThread({})).toBe('general');
  });
  test('the screen sorts threads into channels the same way the server does', () => {
    const cases = [{ state: { channel: 'x' } }, { state: { crm_ask: true } }, { state: { task_id: 1 } }, { state: { agent: 'producer' } }, { state: { agent: 'auto' } }, {}];
    for (const t of cases) expect(browserChannels.channelOfThread(t)).toBe(channelOfThread(t));
    const grouped = browserChannels.groupByChannel([
      { id: 'a', state: {}, updated_at: '2026-10-01' },
      { id: 'b', state: {}, updated_at: '2026-10-20' },
      { id: 'c', state: { channel: 'social' } },
    ]);
    expect(grouped.general.map((t) => t.id)).toEqual(['b', 'a']);
    expect(grouped.social.map((t) => t.id)).toEqual(['c']);
  });
  test('a project name becomes a safe key', () => {
    expect(channelKey('AI & Leadership')).toBe('ai-and-leadership');
    expect(channelKey('  The OCC follow-up! ')).toBe('the-occ-follow-up');
  });
});

describe('the whole team in every thread', () => {
  test('nobody speaks up unless they have something; never the one who answered; at most two', () => {
    expect(pickSpeakers({ speakers: [] }, 'auto')).toEqual([]);
    expect(pickSpeakers(null, 'auto')).toEqual([]);
    const out = pickSpeakers(
      { speakers: [{ agent: 'auto', note: 'x' }, { agent: 'reach', note: 'Tuesday noon is stronger' }, { agent: 'reach', note: 'again' }, { agent: 'jot', note: '' }, { agent: 'producer', note: 'A guest fits' }, { agent: 'jot', note: 'late' }] },
      'auto'
    );
    expect(out).toEqual([
      { agent: 'reach', name: 'Vox', note: 'Tuesday noon is stronger' },
      { agent: 'producer', name: 'Cam', note: 'A guest fits' },
    ]);
    expect(MAX_SPEAKERS).toBe(2);
  });
  test('only Bart asking counts; a teammate’s turn or a task does not set off another round', () => {
    const reply = { role: 'assistant', content: 'Here it is', meta: { agent: 'reach' } };
    expect(lastExchange([{ role: 'user', content: 'How are quote cards doing?' }, reply])).toEqual({ question: 'How are quote cards doing?', reply: 'Here it is', answeredBy: 'reach' });
    expect(lastExchange([{ role: 'user', content: '[TEAM] Jot, add your part' }, reply])).toBeNull();
    expect(lastExchange([{ role: 'user', content: '[TEAM TASK from Ada] x' }, reply])).toBeNull();
    expect(lastExchange([{ role: 'user', content: 'hi', meta: { team_note: true } }, reply])).toBeNull();
    expect(lastExchange([{ role: 'user', content: 'hi' }])).toBeNull();
  });
  test('the check asks the others, not the one who answered, and says most of the time nobody', () => {
    const p = speakUpPrompt({ question: 'q', reply: 'r', answeredBy: 'reach', channel: 'social' });
    expect(p).toMatch(/Vox just answered Bart in #social/);
    expect(p).toMatch(/- jot: Jot/);
    expect(p).not.toMatch(/- reach: Vox/);
    expect(p).toMatch(/Most of the time the answer is nobody/);
  });
  test('the screen and the server word the teammate’s turn the same way', () => {
    const sp = { name: 'Vox', note: 'Tuesday is stronger' };
    expect(browserSpeakUp.speakUpMessage(sp)).toBe(speakUpMessage(sp));
    expect(speakUpMessage(sp)).toMatch(/^\[TEAM\] Vox, you have something to add/);
  });
  test('@team brings in everyone, Ada first, on the server and the screen', () => {
    for (const fn of [mentionedAgents, browserMentions.mentionedAgents]) {
      expect(fn('@team what do you think?')).toEqual(['auto', 'jot', 'reach', 'producer']);
      expect(fn('@Vox and @team')).toEqual(['reach', 'auto', 'jot', 'producer']);
    }
    expect(browserMentions.MENTION_CHOICES.map((c) => c.handle)).toContain('team');
  });
});

describe('wiring', () => {
  const panel = readFileSync('src/components/ao/AutoV2Panel.jsx', 'utf8');
  test('teammates speak up only when Bart named nobody', () => {
    expect(panel).toMatch(/if \(!named\.length && replyThreadId\)/);
    expect(panel).toMatch(/\/api\/ao\/team\/speak-up/);
  });
  test('a thread started in a channel belongs to it and its lead answers', () => {
    const route = readFileSync('api/ao/auto/thread/new.js', 'utf8');
    expect(route).toMatch(/getChannel\(auth\.email/);
    expect(route).toMatch(/normalizeAgent\(req\.body\?\.agent \|\| channel\?\.lead\)/);
  });
  test('the team is told where things are, so Bart never has to go looking', async () => {
    const { teamRosterBlock } = await import('../ao/team/agents.js');
    const roster = teamRosterBlock();
    expect(roster).toMatch(/Bart should never have to go looking/);
    expect(roster).toMatch(/\/ao\/library\/review-queue#emails/);
    expect(roster).toMatch(/@team for everyone/);
  });
  test('both addresses are routed', () => {
    const v = readFileSync('vercel.json', 'utf8');
    expect(v).toMatch(/"src": "\/api\/ao\/channels"/);
    expect(v).toMatch(/"src": "\/api\/ao\/team\/speak-up"/);
  });
});
