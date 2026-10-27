/**
 * @jest-environment node
 *
 * Bart, 2026-10-27, on the Josiah conversation: "I was trying to say Generate
 * image and couldn't get a word in", "Auto failed and I had to touch the retry
 * button" (his notes were saved twice), plus the team problems found in the
 * same review: Red editing after Bart's approval, the team deciding what
 * counts as his yes, huddles over one-line answers, Jot making Cam's images,
 * and system notes landing in his chat by mistake.
 */
jest.mock('../supabase-admin.js', () => ({ supabaseAdmin: { from: () => ({}) } }));
import { readFileSync } from 'node:fs';
import { retryDecision } from '../ao/team/interrupt.js';
import { isQuietAsk } from '../ao/team/speakUp.js';
import { looksLikeOutline, wantsEditorPass } from '../ao/team/editorPass.js';
import { approvedPostGuard } from '../ao/team/approvalGuard.js';
import { isImageAsk, personaPreamble } from '../ao/team/agents.js';
import { findUnbackedActionClaims, maskShownContent } from '../ao/gateActionClaims.js';
import { findFalseDenialClaims } from '../ao/gateDenialClaims.js';

const NOW = Date.parse('2026-10-27T03:40:00Z');
const at = (min) => new Date(NOW - min * 60 * 1000).toISOString();
const notes = 'Do we need to say what the word was?';

describe('Retry never saves or answers Bart twice', () => {
  test('already answered: show that reply', () => {
    const msgs = [
      { role: 'user', content: notes, created_at: at(2) },
      { role: 'assistant', content: 'Red: four notes', created_at: at(1) },
    ];
    expect(retryDecision(msgs, notes, NOW)).toEqual({ action: 'answered', reply: 'Red: four notes' });
  });
  test('still being answered: wait for it', () => {
    expect(retryDecision([{ role: 'user', content: notes, created_at: at(1) }], notes, NOW)).toEqual({ action: 'working' });
  });
  test('saved but never answered: answer it without saving it again', () => {
    const msg = { role: 'user', content: notes, created_at: at(8) };
    expect(retryDecision([msg], notes, NOW)).toEqual({ action: 'reuse', message: msg });
  });
  test('a team note after Bart does not hide his message', () => {
    const msgs = [
      { role: 'user', content: notes, created_at: at(2) },
      { role: 'user', content: '[TEAM] Huddle. Red, your turn', meta: { team_note: true }, created_at: at(1) },
    ];
    expect(retryDecision(msgs, notes, NOW).action).toBe('working');
  });
  test('a different or old message is sent as new', () => {
    expect(retryDecision([{ role: 'user', content: 'something else', created_at: at(1) }], notes, NOW)).toEqual({ action: 'new' });
    expect(retryDecision([{ role: 'user', content: notes, created_at: at(30) }], notes, NOW)).toEqual({ action: 'new' });
  });
});

describe('No huddle over a short decision', () => {
  test('a one-line decision with a short reply is quiet', () => {
    expect(isQuietAsk('Post is approved', 'Jot: Got it. Nothing more to do.')).toBe(true);
    expect(isQuietAsk('Generate the image', 'Jot: Here is the header.')).toBe(true);
  });
  test('a draft in reply is still checked, and @team always is', () => {
    expect(isQuietAsk('Outline is approved.', 'word '.repeat(500))).toBe(false);
    expect(isQuietAsk('@team thoughts?', 'short')).toBe(false);
  });
  test('a real question is not quiet', () => {
    expect(isQuietAsk('For Entry 3 of the AI and Leadership series, what should the opening scene be, and how does it set up the argument?', 'short')).toBe(false);
  });
});

describe("Red's automatic pass", () => {
  const ctx = { agent: 'jot', threadId: 't1' };
  const prose = 'The scroll turned up during a construction job. '.repeat(80);
  test('runs on a real draft', () => {
    expect(wantsEditorPass({ input: { slug: 'x', content: prose }, ctx, result: { ok: true } })).toBe(true);
  });
  test('never runs after Bart approved it', () => {
    expect(wantsEditorPass({ input: { slug: 'x', content: prose, status: 'approved' }, ctx, result: { ok: true } })).toBe(false);
  });
  test('never runs on an outline saved as text', () => {
    const outline = `1. THE SCROLL IN THE RUBBLE (about 250 words)\nPoint: a king tears his clothes.\n${'How it lands: detail. '.repeat(200)}\nTurn: x\nHand-off: y`;
    expect(looksLikeOutline(outline)).toBe(true);
    expect(wantsEditorPass({ input: { slug: 'x', content: outline }, ctx, result: { ok: true } })).toBe(false);
    expect(looksLikeOutline(prose)).toBe(false);
  });
});

describe('Only Bart approves', () => {
  const approved = { status: 'approved', content: 'The approved text.' };
  test('team work cannot change an approved post', () => {
    expect(approvedPostGuard({ ctx: { taskId: 'k' }, existing: approved, input: { content: 'Edited text.' } })).toMatchObject({ ok: false, gate: 'approved_by_bart' });
  });
  test('team work cannot mark a post approved', () => {
    expect(approvedPostGuard({ ctx: { taskId: 'k' }, existing: { status: 'draft' }, input: { content: 'x', status: 'approved' } })).toMatchObject({ ok: false, gate: 'approval_is_barts' });
  });
  test("Bart's own conversation is untouched by the guard", () => {
    expect(approvedPostGuard({ ctx: {}, existing: approved, input: { content: 'Edited text.' } })).toBeNull();
    expect(approvedPostGuard({ ctx: { taskId: 'k' }, existing: approved, input: { content: 'The approved text.' } })).toBeNull();
  });
  test('every teammate is told approval is his words only, and images are Cam\'s', () => {
    for (const k of ['jot', 'reach', 'producer', 'editor']) {
      expect(personaPreamble(k)).toMatch(/Only Bart's own words approve anything/);
      expect(personaPreamble(k)).toMatch(/Images are Cam's/);
    }
    expect(readFileSync('lib/ao/autoV2.js', 'utf8')).toMatch(/never invent a rule for reading his approval/);
  });
});

describe('Images Bart asks for go to Cam', () => {
  test('image requests', () => {
    expect(isImageAsk('Generate the image')).toBe(true);
    expect(isImageAsk('redo the header without Rehoboam')).toBe(true);
    expect(isImageAsk('Post is approved')).toBe(false);
    expect(isImageAsk('[TEAM] Cam, generate the image')).toBe(false);
  });
  test('the chat engine routes them to the producer when nobody is named', () => {
    const src = readFileSync('api/ao/auto/chat.js', 'utf8');
    expect(src).toMatch(/isImageAsk\(userMessage\) \? 'producer'/);
    expect(src).toMatch(/stopHuddle\(thread\.id, 'Bart spoke'\)/);
    expect(src).toMatch(/retryDecision\(recent\.messages, userMessage\)/);
  });
});

describe('System notes stay out of the chat when they are wrong', () => {
  test('a post shown in the reply is not a claim to have rebuilt anything', () => {
    const reply = 'Jot: The post is safe.\n\n[ARTIFACT type="draft"]He rebuilt the high places his father had torn down.[/ARTIFACT]';
    expect(maskShownContent(reply)).not.toMatch(/rebuilt/);
    expect(maskShownContent(reply).length).toBe(reply.length);
    expect(findUnbackedActionClaims(reply, { toolResults: [] }).unbacked.filter((u) => u.matchedText === 'rebuilt')).toEqual([]);
  });
  test('a reply showing the image is not denying it has one', () => {
    const url = 'https://example.com/journal-header-2.png';
    const reply = `Jot: Here's the new version.\n\n![header](${url})\n\nI can't see the picture myself, so you're the only one who can confirm the image.`;
    expect(findFalseDenialClaims(reply, { imageUrls: [url] }).falseDenials).toEqual([]);
  });
  test('the quote-card note only answers a request about cards', () => {
    const src = readFileSync('lib/ao/appendQuoteCardImagesAfterApproval.js', 'utf8');
    expect(src).toMatch(/const aboutCards = /);
  });
});

describe('The chat screen lets Bart keep talking', () => {
  const src = readFileSync('src/components/ao/AutoV2Panel.jsx', 'utf8');
  test('the input stays open while a reply is coming, and what he types is queued', () => {
    expect(src).toMatch(/rows=\{1\}\n\s+disabled=\{startingNew\}/);
    expect(src).toMatch(/queueRef\.current = \[\.\.\.queueRef\.current, textInput\.trim\(\)\]/);
    expect(src).toMatch(/Sends as soon as this reply lands/);
  });
  test('the team works in the background and stops when he speaks', () => {
    expect(src).toMatch(/bgGenRef\.current \+= 1/);
    expect(src).toMatch(/const live = \(\) => bgGenRef\.current === myGen/);
  });
  test('Retry tells the server it is a retry', () => {
    expect(src).toMatch(/sendMessage\(input, \{ retry: true \}\)/);
  });
  test('the working animation always moves and counts seconds', () => {
    expect(src).toMatch(/animate-bounce/);
    expect(src).toMatch(/tabular-nums/);
    expect(src).toMatch(/The team is still working\. You can keep typing\./);
  });
});

describe('Infographics carry the message, not Bart\'s story', () => {
  // Bart, 2026-10-27: "We have to be very careful with my story, and
  // infographics just don't need a whole lot about me in them."
  const { personalStoryLines, eligibleSources, contentPrompt } = require('../ao/infographicContent.js');
  test('the lines from the Rise of Archetype caption are caught', () => {
    for (const line of [
      "After the sale closed, I didn't get relief.",
      "The gym wasn't my dream.",
      'They held when my health gave out and I had to lead from weakness.',
      'Over thirty plus years I did not lead perfectly.',
      'I have refunded a client in full on a project that went wrong.',
    ]) expect(personalStoryLines(line)).toEqual([line]);
  });
  test('the message itself passes', () => {
    expect(personalStoryLines('Standards change cultures. When people know where the lines are, they stop watching their backs. I believe authority is earned.')).toEqual([]);
  });
  test('a piece that is mostly his story is never a source', () => {
    const story = "After the sale closed, I got room. The gym wasn't my dream. My health gave out. I inherited a gym. A company I poured a decade into changed. ".repeat(10);
    const docs = [
      { slug: 'his-story', type: 'journal-post', status: 'published', body: story },
      { slug: 'the-message', type: 'journal-post', status: 'published', body: 'Authority is earned through care and consistency. '.repeat(60) },
    ];
    expect(eligibleSources(docs, new Set(), '2026-10-27').map((d) => d.slug)).toEqual(['the-message']);
  });
  test('the writer is told the graphic is not about Bart', () => {
    expect(contentPrompt({ title: 'T', body: 'b' }, 'steps')).toMatch(/They are not about Bart\. Never tell his personal story/);
  });
});
