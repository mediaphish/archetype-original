/**
 * Rapid Write seed parser regression. Run: node scripts/rapid-write-regression.mjs
 *
 * Tests the optional JSON-array path (fenced block). Freeform paste is handled
 * server-side via parseOrExtractRapidWriteSeeds (needs an API key at runtime).
 */

import {
  parseRapidWriteSeedsJson,
  extractRelatedCorpusBlock,
  extractTagsLineFromMarkdown,
  buildRapidWriteMarkdownFromParts,
  normalizeRapidWriteDraftState,
  wantsRapidWriteActivation,
  wantsExitRapidWrite,
  wantsRapidWriteAgentTraining,
  wantsRunAllSeeds,
  collectRapidWriteOverrideIds,
  RAPID_WRITE_LENGTH_DISCIPLINE,
  wantsRegenerateRapidWriteHeroImage,
  wantsGenerateRapidWriteHeroImages,
  isRapidWriteDraftTextRevisionMessage,
  wantsRapidWriteManualPolishPass,
  rapidWriteSeedIsDraftable,
  extractRapidWriteFirstNamesFromBody,
  rapidWriteBodySignatureSnippets,
  rapidWriteClosingSnippet,
  rapidWriteStoryPatternForBatchIndex,
  RAPID_WRITE_STORY_PATTERN_COUNT,
  normalizeRapidWriteTitleKey,
  rapidWriteTitleDuplicatesPrior,
  countRapidWriteCostOfTitles,
  rapidWriteBodyHasBannedLeaderIntros,
  rapidWriteReflectionTooSimilar,
  RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH,
} from '../lib/ao/rapidWriteMode.js';
import { buildThreadStateSnapshot } from '../lib/ao/autoIntent.js';

let failed = 0;
function ok(name, cond) {
  if (!cond) {
    console.error('FAIL:', name);
    failed += 1;
  } else console.log('ok:', name);
}

const msg = `Rapid Write

\`\`\`json
[{"id":"a","core_idea":"x","leadership_category":"L","psychological_outcome":"P","real_world_context":"r","research_notes":"n","insight_anchor":"new angle here"}]
\`\`\`
`;

ok('activation detected', wantsRapidWriteActivation(msg));
const p = parseRapidWriteSeedsJson(msg);
ok('parse ok', p.ok && p.seeds.length === 1 && p.seeds[0].id === 'a');
ok('exit phrase', wantsExitRapidWrite('Exit Rapid Write'));
ok('agent training line', wantsRapidWriteAgentTraining('Agent Training:\nUse shorter sentences.'));

const md = '## Hi\n\nBody.\n\n*Q?*\n\n**Tags:** L, P\n\n**Related (corpus)**\n- [A](u)';
ok('extract related block', extractRelatedCorpusBlock(md).startsWith('**Related (corpus)**'));
ok('extract tags line', extractTagsLineFromMarkdown(md).join(',') === 'L,P');
const rebuilt = buildRapidWriteMarkdownFromParts('T', 'B', 'R?', extractRelatedCorpusBlock(md), ['L', 'P']);
ok('rebuild keeps related', rebuilt.includes('**Related (corpus)**'));
ok('rebuild has tags', rebuilt.includes('**Tags:**'));
const norm = normalizeRapidWriteDraftState(
  {
    markdown: md,
    seed_id: 'rw-1',
    title: 'Hi',
    slug: 'psychological-cost-x',
    body: 'Body.',
    reflection_question: 'Q?',
  },
  '00000000-0000-0000-0000-000000000001'
);
ok('normalize draft state', norm && norm.corpus_draft_id && norm.seed_id === 'rw-1');

const snap = buildThreadStateSnapshot({
  rapid_write: {
    active: true,
    seeds: [
      {
        id: 'rw-1',
        core_idea: 'idea',
        leadership_category: 'L',
        psychological_outcome: 'P',
        real_world_context: '',
        research_notes: '',
        insight_anchor: 'i',
        new_angle: '',
      },
    ],
    validation: [{ id: 'rw-1', flags: [] }],
    drafts_by_seed_id: {
      'rw-1': {
        title: 'T',
        slug: 's',
        markdown: 'x'.repeat(100),
        body: 'b',
        reflection_question: 'q',
        seed_id: 'rw-1',
      },
    },
  },
});
ok('snapshot draft count', snap.rapid_write_draft_count === 1 && snap.rapid_write_drafts?.[0]?.truncated === false);

ok('wantsRunAll write all N posts', wantsRunAllSeeds('Please write all 10 posts. Make sure to include links.'));
ok('wantsRunAll draft every seed', wantsRunAllSeeds('draft every seed'));

const rwGolden = {
  seeds: [{ id: 'rw-4' }, { id: 'rw-6' }, { id: 'rw-10' }],
  validation: [
    { id: 'rw-4', flags: [{ type: 'overlap', detail: 'x' }] },
    { id: 'rw-6', flags: [{ type: 'overlap', detail: 'x' }] },
    { id: 'rw-10', flags: [{ type: 'overlap', detail: 'x' }] },
  ],
  overrides: [],
};
const goldenMsg =
  'rw-4, rw-6, and rw-10 can all be enhanced or added to. They should not have been flagged. Please write all 10 posts.';
const ov = collectRapidWriteOverrideIds(goldenMsg, rwGolden);
ok(
  'golden message adds overrides',
  ov.source === 'named_approval' && ov.overrides.has('rw-4') && ov.overrides.has('rw-6') && ov.overrides.has('rw-10')
);
ok('golden message also run-all', wantsRunAllSeeds(goldenMsg));

const snapOv = buildThreadStateSnapshot({
  rapid_write: {
    active: true,
    seeds: [
      {
        id: 'rw-1',
        core_idea: 'idea',
        leadership_category: 'L',
        psychological_outcome: 'P',
        real_world_context: '',
        research_notes: '',
        insight_anchor: 'i',
        new_angle: '',
      },
    ],
    validation: [{ id: 'rw-1', flags: [{ type: 'overlap', detail: 'advisory' }] }],
    overrides: ['rw-1'],
    memory: { last_action: 'overrides_updated', batch_intent: { kind: 'revise', seed_ids: ['rw-1'], status: 'done' } },
    drafts_by_seed_id: {},
  },
});
ok('snapshot lists overrides', Array.isArray(snapOv.rapid_write_overrides) && snapOv.rapid_write_overrides.includes('rw-1'));
ok(
  'effective_blocked false when overridden',
  snapOv.rapid_write_seeds?.[0]?.effective_blocked_for_generation === false &&
    snapOv.rapid_write_seeds?.[0]?.owner_approved_despite_flags === true
);
ok('snapshot batch intent', snapOv.rapid_write_batch_intent?.kind === 'revise');
ok(
  'length discipline string',
  RAPID_WRITE_LENGTH_DISCIPLINE.includes('425') && RAPID_WRITE_LENGTH_DISCIPLINE.includes('575')
);
ok('editorial reader block present', RAPID_WRITE_LENGTH_DISCIPLINE.includes('Reader'));
ok('reflection question rules present', RAPID_WRITE_LENGTH_DISCIPLINE.includes('Reflection question'));
ok(
  'register anti-feed block present',
  RAPID_WRITE_LENGTH_DISCIPLINE.includes('Register (anti-feed') &&
    RAPID_WRITE_LENGTH_DISCIPLINE.includes('throat-clearing')
);
ok(
  'story settings and names block present',
  RAPID_WRITE_LENGTH_DISCIPLINE.includes('Story settings and names') &&
    RAPID_WRITE_LENGTH_DISCIPLINE.includes('software engineering')
);
ok('anti-formula block present', RAPID_WRITE_LENGTH_DISCIPLINE.includes('Anti-formula'));
ok('reflection ban How can you', RAPID_WRITE_LENGTH_DISCIPLINE.includes('How can you'));
ok('batch uniqueness block', RAPID_WRITE_LENGTH_DISCIPLINE.includes('Run all') && RAPID_WRITE_LENGTH_DISCIPLINE.includes('batch'));
ok('anti-model prose / banned leader intros', RAPID_WRITE_LENGTH_DISCIPLINE.includes('Banned leader intros'));
ok('hum-of ban broadened', RAPID_WRITE_LENGTH_DISCIPLINE.includes('hum of'));
ok('default stock scene guard', RAPID_WRITE_LENGTH_DISCIPLINE.includes('conference room'));
ok('story pattern count is 12', RAPID_WRITE_STORY_PATTERN_COUNT === 12);
ok(
  'story patterns differ by index',
  rapidWriteStoryPatternForBatchIndex(0) !== rapidWriteStoryPatternForBatchIndex(1) &&
    rapidWriteStoryPatternForBatchIndex(0).includes('Pattern 1')
);
const longHetero = Array.from({ length: 100 }, (_, i) => `seg${String(i).padStart(3, '0')}`).join(' ');
ok('body signature multi-slice on long text', rapidWriteBodySignatureSnippets(longHetero).length >= 3);
ok(
  'closing snippet last paragraph',
  rapidWriteClosingSnippet('First para.\n\nLast paragraph here.').includes('Last paragraph')
);

const reviseAllMsg =
  'Revise every Rapid Write draft (rw-1 through rw-10). Cut anything that repeats the same insight in new paragraphs—merge or delete until each paragraph adds a real new layer.';
ok('revise-all: not misread as hero regenerate', !wantsRegenerateRapidWriteHeroImage(reviseAllMsg));
ok('revise-all: classified as draft text revision', isRapidWriteDraftTextRevisionMessage(reviseAllMsg));
ok('hero regenerate explicit', wantsRegenerateRapidWriteHeroImage('Regenerate hero image for rw-3 in Rapid Write'));
ok('hero generate explicit', wantsGenerateRapidWriteHeroImages('Generate hero images for all Rapid Write drafts'));
ok('manual polish phrase', wantsRapidWriteManualPolishPass('Editor pass for rw-2 in Rapid Write'));

const valOverlap = [{ id: 'rw-1', flags: [{ type: 'overlap', detail: 'x' }] }];
const valPlainFact = [{ id: 'rw-2', flags: [{ type: 'plain_fact', detail: 'x' }] }];
const emptyOverrides = new Set();
ok('run_all: unflagged draftable', rapidWriteSeedIsDraftable('rw-0', [], emptyOverrides, 'run_all'));
ok('run_all: overlap still draftable', rapidWriteSeedIsDraftable('rw-1', valOverlap, emptyOverrides, 'run_all'));
ok('run_all: plain_fact does not block', rapidWriteSeedIsDraftable('rw-2', valPlainFact, emptyOverrides, 'run_all'));
ok('next: overlap blocked without override', !rapidWriteSeedIsDraftable('rw-1', valOverlap, emptyOverrides, 'next'));
ok('next: overlap ok with override', rapidWriteSeedIsDraftable('rw-1', valOverlap, new Set(['rw-1']), 'next'));
ok('next: plain_fact blocked without override', !rapidWriteSeedIsDraftable('rw-2', valPlainFact, emptyOverrides, 'next'));
ok('next: plain_fact ok with override', rapidWriteSeedIsDraftable('rw-2', valPlainFact, new Set(['rw-2']), 'next'));

ok('name extract sarah', extractRapidWriteFirstNamesFromBody('Sarah met Claire.').includes('Sarah'));
ok('body signature short body single chunk', rapidWriteBodySignatureSnippets('x'.repeat(80)).length === 1);

ok(
  'title key normalizes punctuation',
  normalizeRapidWriteTitleKey('The Cost of Avoidance!') === normalizeRapidWriteTitleKey('the cost of avoidance')
);
ok(
  'duplicate title detected vs batch',
  rapidWriteTitleDuplicatesPrior('The Cost of Avoidance', ['Other', 'the cost of avoidance.'])
);
ok(
  'cost-of title count',
  countRapidWriteCostOfTitles(['The Cost of X', 'Hello', 'the cost of y']) === 2
);
ok('max cost-of constant is 2', RAPID_WRITE_MAX_COST_OF_TITLES_PER_BATCH === 2);
ok(
  'banned leader intro detected',
  rapidWriteBodyHasBannedLeaderIntros('The leader, known for his calm, said nothing.')
);
ok(
  'banned leader intro absent for clean prose',
  !rapidWriteBodyHasBannedLeaderIntros('The room went quiet when she set down the folder.')
);
const qA =
  'What barriers to innovation and ownership might your team be facing as they navigate a culture of control?';
const qB =
  'What barriers to innovation and ownership might your team be facing as they navigate a culture of overcontrol?';
ok('reflection too similar on long shared stem', rapidWriteReflectionTooSimilar(qB, [qA]));
ok('reflection not similar when different shape', !rapidWriteReflectionTooSimilar('Who pays the price when praise is hollow?', [qA]));

process.exit(failed ? 1 : 0);
