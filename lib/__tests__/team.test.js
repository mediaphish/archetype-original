/**
 * @jest-environment node
 *
 * Auto's team (Bart, 2026-10-25): "I could pull them all into a room, lay out
 * the vision ... Then they run autonomously until they need me again."
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the team', () => {
  test('Auto, Jot and Reach, and anything unknown falls back to Auto', async () => {
    const { AGENTS, normalizeAgent } = await import('../ao/team/agents.js');
    expect(Object.keys(AGENTS)).toEqual(['auto', 'jot', 'reach', 'producer', 'editor']);
    expect(AGENTS.jot.name).toBe('Jot');
    expect(normalizeAgent('JOT')).toBe('jot');
    expect(normalizeAgent('someone')).toBe('auto');
    expect(normalizeAgent(null)).toBe('auto');
  });

  test('each teammate speaks as themselves and Auto keeps its own prompt', async () => {
    const { personaPreamble, teamRosterBlock } = await import('../ao/team/agents.js');
    expect(personaPreamble('auto')).toBe('');
    expect(personaPreamble('jot')).toMatch(/You are Jot/);
    expect(personaPreamble('jot')).toMatch(/Start each reply with "Jot:"/);
    expect(personaPreamble('jot')).toMatch(/do not publish, schedule or approve/);
    expect(personaPreamble('reach')).toMatch(/You are Vox/);
    expect(teamRosterBlock()).toMatch(/final word on everything/);
    expect(teamRosterBlock()).toMatch(/never for permission to do what he already asked/);
  });
});

describe('background passes', () => {
  test('the first pass carries the brief; later passes carry where it left off', async () => {
    const { passMessage } = await import('../ao/team/runTask.js');
    const task = { title: 'Brief: The Decision', brief: 'Write the brief.', assigned_by: 'auto', passes: 1, max_passes: 8 };
    const first = passMessage(task);
    expect(first).toMatch(/^\[TEAM TASK from Ada\] Brief: The Decision/);
    expect(first).toMatch(/Write the brief\./);
    expect(first).toMatch(/call task_update/);
    const later = passMessage({ ...task, passes: 3, last_note: 'Outline left' });
    expect(later).toMatch(/pass 3 of 8/);
    expect(later).toMatch(/Where you left off: Outline left/);
    expect(passMessage(task, { resumedAfterBart: true })).toMatch(/Bart answered above/);
  });
});

describe('wiring', () => {
  const chat = read('api/ao/auto/chat.js');
  const autoV2 = read('lib/ao/autoV2.js');
  const handlers = read('lib/ao/autoToolHandlers.js');
  const vercel = JSON.parse(read('vercel.json'));

  test('the chat and background tasks share one turn', () => {
    expect(chat).toMatch(/export async function runChatTurn\(/);
    expect(chat).toMatch(/await runChatTurn\(\{/);
    expect(read('lib/ao/team/runTask.js')).toMatch(/runChatTurn/);
  });

  test('leaving the chat no longer throws the reply away', () => {
    expect(chat).not.toMatch(/skipping post-stream processing/);
    expect(chat).toMatch(/finishing and saving the reply/);
  });

  test('the team tools exist and run', () => {
    for (const name of ['assign_task', 'task_update', 'team_board']) {
      expect(autoV2).toContain(`name: '${name}'`);
      expect(handlers).toContain(`case '${name}':`);
    }
    expect(autoV2).toMatch(/personaPreamble\(options\.agent\)/);
  });

  test('the runner is long-running, routed, and swept every five minutes', () => {
    const build = vercel.builds.find((b) => b.src === 'api/ao/team/run.js');
    expect(build?.config?.maxDuration).toBe(300);
    expect(build.config.includeFiles).toContain('ao-knowledge-hq-kit/**');
    expect(vercel.routes.some((r) => r.src === '/api/ao/team/run')).toBe(true);
    expect(vercel.routes.some((r) => r.src === '/api/ao/team/tasks')).toBe(true);
    expect(vercel.crons.find((c) => c.path === '/api/ao/team/run')?.schedule).toBe('*/5 * * * *');
  });

  test('the runner refuses anyone without the cron secret', () => {
    expect(read('api/ao/team/run.js')).toMatch(/if \(!cronSecret \|\| provided !== cronSecret\)/);
  });
});

describe('clean teammate replies', () => {
  test('a short lead-in before the name is dropped, real content is kept', async () => {
    const { trimLeadInBeforeName } = await import('../ao/team/agents.js');
    expect(trimLeadInBeforeName("I have three good candidates. That's sufficient.Jot: Done.", 'Jot')).toBe('Jot: Done.');
    expect(trimLeadInBeforeName('Jot: Done.', 'Jot')).toBe('Jot: Done.');
    const long = `${'x'.repeat(500)} Jot: later`;
    expect(trimLeadInBeforeName(long, 'Jot')).toBe(long);
  });

  test('the weekly Reach jobs are scheduled on plain addresses', () => {
    const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
    expect(vercel.crons.find((c) => c.path === '/api/cron/ao/reach-weekly/lookahead')?.schedule).toBe('0 14 * * 4');
    expect(vercel.crons.find((c) => c.path === '/api/cron/ao/reach-weekly/report')?.schedule).toBe('30 13 * * 1');
  });
});

describe('the team runs on the top model', () => {
  test('Auto, Jot and Reach default to Opus 5.5', () => {
    expect(readFileSync(join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8')).toMatch(/const MODEL = process\.env\.AUTO_ANTHROPIC_MODEL \|\| 'claude-opus-5-5';/);
  });
  test('no reply is read from its first block alone', () => {
    for (const f of ['lib/ao/statedPreferences.js', 'lib/ao/voiceGuardrails.js', 'lib/ao/processEpisodeResearchSignal.js', 'api/ao/auto/chat.js', 'api/ao/auto/derive-content.js']) {
      expect(readFileSync(join(process.cwd(), f), 'utf8')).not.toMatch(/content\?\.\[0\]\?\.text/);
    }
  });
});

describe('bridges between chats, the Queue and Reach', () => {
  test('talk it over opens Auto with the note started, addressed to the teammate', async () => {
    const { discussUrl } = await import('../../src/lib/discussLink.js');
    expect(discussUrl({ text: 'about the week: ', agent: 'reach' })).toBe(`/ao/analyst?compose=${encodeURIComponent('Vox, about the week: ')}`);
    expect(discussUrl({ text: 'hello' })).toBe('/ao/analyst?compose=hello');
  });
  test('the Queue shows the week and the chat reads a started note', () => {
    const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
    expect(vercel.routes.some((r) => r.src === '/api/ao/reach/week')).toBe(true);
    expect(readFileSync(join(process.cwd(), 'src/pages/ao/ReviewQueue.jsx'), 'utf8')).toMatch(/<ReachWeek onNavigate=\{handleNavigate\} \/>/);
    expect(readFileSync(join(process.cwd(), 'src/components/ao/AutoV2Panel.jsx'), 'utf8')).toMatch(/params\.get\('compose'\)/);
  });
});

describe('the Producer', () => {
  test('the opening is lifted from the brief word for word', async () => {
    const { personInOneParagraph } = await import('../ao/team/producer.js');
    const brief = '1. THE PERSON IN ONE PARAGRAPH\nErik builds bridges and raised a son who builds companies.\n\n2. WHERE THE BEST MATERIAL PROBABLY LIVES\nTheir shop.';
    expect(personInOneParagraph(brief)).toBe('Erik builds bridges and raised a son who builds companies.');
    expect(personInOneParagraph('**1. THE PERSON IN ONE PARAGRAPH**\n\nAdam runs a crew.\n\n**2. WHERE THE BEST MATERIAL')).toBe('Adam runs a crew.');
    expect(personInOneParagraph('')).toBe('');
  });
  test('the Producer has its podcast tools and a half-hourly check for waiting guests', () => {
    const autoV2 = readFileSync(join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8');
    for (const name of ['podcast_guests', 'podcast_prepare_guest', 'podcast_show_notes']) expect(autoV2).toContain(`name: '${name}'`);
    const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
    expect(vercel.crons.find((c) => c.path === '/api/cron/ao/producer-intake')?.schedule).toBe('*/30 * * * *');
  });
});

describe('email from Bart\'s account', () => {
  test('emails go out under the teammate\'s name, for Bart', async () => {
    const { senderName } = await import('../ao/team/outbox.js');
    expect(senderName('reach')).toBe('Vox, for Bart Paden');
    expect(senderName('producer')).toBe('Cam, for Bart Paden');
  });
  test('every email waits for Bart; only his Gmail sends approved ones', () => {
    const outbox = readFileSync(join(process.cwd(), 'lib/ao/team/outbox.js'), 'utf8');
    expect(outbox).toMatch(/\.eq\('status', 'approved'\)/);
    const gs = readFileSync(join(process.cwd(), 'notes/gmail-sync/Code.gs'), 'utf8');
    expect(gs).toMatch(/function sendOutbox\(\)/);
    expect(gs).toMatch(/\?outbox=1/);
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'notes/gmail-sync/appsscript.json'), 'utf8'));
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/gmail.send');
    expect(manifest.oauthScopes).not.toContain('https://mail.google.com/');
  });
  test('the draft tool exists and the Queue shows waiting emails first', () => {
    expect(readFileSync(join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8')).toContain("name: 'draft_email'");
    expect(readFileSync(join(process.cwd(), 'src/pages/ao/ReviewQueue.jsx'), 'utf8')).toMatch(/<OutboxReview \/>\s*\n\s*<ReachWeek/);
  });
});

describe('@mentions bring teammates in', () => {
  test('mentions are read in order, Cam means the producer, and an opening name counts', async () => {
    const { mentionedAgents } = await import('../ao/team/agents.js');
    expect(mentionedAgents('@Vox schedule these for Wednesday')).toEqual(['reach']);
    expect(mentionedAgents('Vox, schedule these')).toEqual(['reach']);
    expect(mentionedAgents('@Jot tighten it and @Vox place it, @cam too')).toEqual(['jot', 'reach', 'producer']);
    expect(mentionedAgents('email bart@reach.com about it')).toEqual([]);
    expect(mentionedAgents('no one named here')).toEqual([]);
  });
  test('the screen and the server read mentions the same way', async () => {
    const server = await import('../ao/team/agents.js');
    const client = await import('../../src/lib/teamMentions.js');
    for (const t of ['@Vox go', 'Jot: fix it', '@Jot and @Ada', 'x@jot.com', '@CAM hi', 'Ada, @Vox', '@Reach and @Auto']) {
      expect(client.mentionedAgents(t)).toEqual(server.mentionedAgents(t));
    }
  });
  test('a draft worked on by tools opens its tabs in this conversation', async () => {
    const { findDraftWorkedByTools } = await import('../../src/components/ao/draftArtifactSync.js');
    const msgs = [
      { role: 'user', content: 'Now the image?' },
      { role: 'assistant', content: 'Jot: done', meta: { tool_results: [{ name: 'generate_image', result: { ok: true, slug: 'the-decision-you-cannot-hand-off', title: 'The Decision You Cannot Hand Off' } }] } },
    ];
    expect(findDraftWorkedByTools(msgs)).toMatchObject({ type: 'draft', slug: 'the-decision-you-cannot-hand-off' });
    expect(findDraftWorkedByTools([{ role: 'assistant', content: 'hi' }])).toBeNull();
  });
});

describe('the 2026-10-26 names: Ada and Vox, with Auto as the whole system', () => {
  test('Ada is the Marketing Director, Vox the publicist', async () => {
    const { AGENTS } = await import('../ao/team/agents.js');
    expect(AGENTS.auto).toMatchObject({ name: 'Ada', role: 'Marketing Director' });
    expect(AGENTS.reach).toMatchObject({ name: 'Vox', role: 'Publicist' });
    expect([AGENTS.jot.name, AGENTS.producer.name]).toEqual(['Jot', 'Cam']);
  });
  test('the new names bring a teammate in, on the server and in the browser; the old ones no longer do', async () => {
    const server = (await import('../ao/team/agents.js')).mentionedAgents;
    const browser = (await import('../../src/lib/teamMentions.js')).mentionedAgents;
    for (const fn of [server, browser]) {
      expect(fn('@Vox place it and @Ada check it')).toEqual(['reach', 'auto']);
      expect(fn('Vox, what is going out?')).toEqual(['reach']);
      expect(fn('@Reach and @Auto')).toEqual([]);
    }
  });
});
