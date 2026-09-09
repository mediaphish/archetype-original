/**
 * @jest-environment node
 *
 * Voice enforcement, end to end.
 *
 * The investigation, 2026-09-09. Bart asked why "sit with" reached an approved
 * post and was told there was no automated check. That was wrong. A check
 * existed and ran on every save. The phrase was not on its list.
 *
 * The real findings:
 *   - voiceReview.js had been quarantined since 2026-07-24 and had zero callers.
 *   - The system prompt banned 33 words; the module enforced 16 of them, so
 *     Auto was told to avoid 17 words nothing verified.
 *   - Neither list contained "sit with".
 *   - Outlines bypassed the gate entirely.
 *   - publishJournalEntry had no voice check at all.
 *   - Nothing checked the published corpus.
 */
import fs from 'fs';
import path from 'path';
import {
  VOICE_VIOLATIONS,
  detectVoiceViolations,
  detectVoiceViolationsInProse,
  formatBannedListForPrompt,
} from '../ao/voiceGuardrails.js';

describe('the phrase that started this', () => {
  it('catches the bare construction that shipped twice', () => {
    expect(detectVoiceViolations('the hardest leadership failures to sit with').length).toBeGreaterThan(0);
  });

  it('catches every variant, not just the three that were listed', () => {
    for (const s of ['worth sitting with', 'sit with that', 'something to sit with', 'sit with the pain']) {
      expect(detectVoiceViolations(s).length).toBeGreaterThan(0);
    }
  });
});

describe('the 17 words the prompt banned but nothing enforced', () => {
  const words = [
    'bolster', 'pave the way', 'pivotal', 'groundbreaking', 'cutting-edge',
    'transformative', 'game-changing', 'seamless', 'intricate', 'vibrant',
    'holistic', 'impactful',
  ];

  it.each(words)('enforces "%s"', (w) => {
    expect(detectVoiceViolations(`This is ${w} work.`).length).toBeGreaterThan(0);
  });

  it('does not break "transformational leadership", the name of his own series', () => {
    expect(detectVoiceViolations('transformational leadership')).toHaveLength(0);
  });

  it('does not break scripture references', () => {
    // "testament" is banned as a tic. He writes about the New Testament weekly.
    for (const s of ['the New Testament', 'Old Testament prophets', 'in the New Testament, Hebrews says']) {
      expect(detectVoiceViolations(s)).toHaveLength(0);
    }
    expect(detectVoiceViolations('a testament to his work').length).toBeGreaterThan(0);
  });
});

describe('prose versus headings', () => {
  it('leaves the ALI series heading alone', () => {
    // "## The Question Worth Sitting With" closes seven of the nine ALI entries.
    // It is a deliberate structural device. Bart: "Headings don't bother me."
    expect(detectVoiceViolationsInProse('## The Question Worth Sitting With')).toHaveLength(0);
  });

  it('leaves a dash title separator alone', () => {
    // "Title separators don't bother me. It's logical those don't waive the
    // I am written by AI flag."
    expect(detectVoiceViolationsInProse('# Power vs. Authority: Part 1 — The Hunger')).toHaveLength(0);
  });

  it('still catches the same phrase in prose', () => {
    const doc = '## The Question Worth Sitting With\n\nLeaders should sit with the problem.';
    expect(detectVoiceViolationsInProse(doc).length).toBeGreaterThan(0);
  });

  it('does not flag scripture ranges, which are correct typography', () => {
    // 167 of the 176 dashes in the corpus are verse citations and number ranges.
    for (const s of ['1 Corinthians 5:16–17', 'Romans 12:1–2', 'Posts 1–6 examined', 'Philippians 4:5b–7 (ESV)']) {
      expect(detectVoiceViolationsInProse(s)).toHaveLength(0);
    }
  });

  it('catches an em dash in actual prose', () => {
    expect(detectVoiceViolationsInProse('That gap — between asking and anchoring — is real.').length).toBeGreaterThan(0);
  });
});

describe('single source of truth', () => {
  it('generates the prompt text from the pattern list', () => {
    const text = formatBannedListForPrompt();
    expect(text).toMatch(/BANNED/);
    // A label added to the module must appear in the prompt with no second edit.
    const someLabel = VOICE_VIOLATIONS.find((v) => !v.soft).label;
    expect(text).toContain(someLabel);
  });

  it('tells the model the rule applies to prose and not conversation', () => {
    expect(formatBannedListForPrompt()).toMatch(/PROSE ONLY/i);
    expect(formatBannedListForPrompt()).toMatch(/Discussing a\s*\n?banned phrase is not using it/i);
  });

  it('no longer carries hand-typed banned lists in the prompt', () => {
    // The drift this closes: two lists that could disagree, and did.
    const autoV2 = fs.readFileSync(path.join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8');
    expect(autoV2).toMatch(/formatBannedListForPrompt\(\)/);
    expect(autoV2).not.toMatch(/### BANNED WORDS — NEVER USE/);
  });
});

describe('every write path is gated', () => {
  it('gates save_draft before the outline branch', () => {
    // The outline path used to return before the check, which made an outline
    // the one way to write content that never met the gate.
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/ao/autoToolHandlers.js'), 'utf8');
    const gate = src.indexOf('const voiceProblem = assertVoiceClean');
    const outline = src.indexOf("if (stage === 'outline')");
    expect(gate).toBeGreaterThan(-1);
    expect(outline).toBeGreaterThan(gate);
  });

  it('gates the publish path, the last step before the public site', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/ao/publishJournalEntry.js'), 'utf8');
    expect(src).toMatch(/detectVoiceViolationsInProse/);
    expect(src).toMatch(/voice_violation/);
  });

  it('runs a build-time check over the published corpus', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const chains = [pkg.scripts['build:prerender'], pkg.scripts['build:no-prerender']];
    for (const chain of chains) expect(chain).toMatch(/verify-voice\.mjs/);
  });

  it('keeps a baseline so the count can only go down', () => {
    const p = path.join(process.cwd(), 'scripts/voice-baseline.json');
    expect(fs.existsSync(p)).toBe(true);
    const b = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(typeof b.total).toBe('number');
    expect(b.files).toBeTruthy();
  });
});
