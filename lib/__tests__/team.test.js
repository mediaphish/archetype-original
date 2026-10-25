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
    expect(Object.keys(AGENTS)).toEqual(['auto', 'jot', 'reach']);
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
    expect(personaPreamble('reach')).toMatch(/You are Reach/);
    expect(teamRosterBlock()).toMatch(/final word on everything/);
    expect(teamRosterBlock()).toMatch(/never for permission to do what he already asked/);
  });
});

describe('background passes', () => {
  test('the first pass carries the brief; later passes carry where it left off', async () => {
    const { passMessage } = await import('../ao/team/runTask.js');
    const task = { title: 'Brief: The Decision', brief: 'Write the brief.', assigned_by: 'auto', passes: 1, max_passes: 8 };
    const first = passMessage(task);
    expect(first).toMatch(/^\[TEAM TASK from Auto\] Brief: The Decision/);
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
