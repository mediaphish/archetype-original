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
ok(
  'landing discipline present',
  RAPID_WRITE_LENGTH_DISCIPLINE.includes('Landing and stop') && RAPID_WRITE_LENGTH_DISCIPLINE.includes('behavior')
);

const reviseAllMsg =
  'Revise every Rapid Write draft (rw-1 through rw-10). Cut anything that repeats the same insight in new paragraphs—merge or delete until each paragraph adds a real new layer.';
ok('revise-all: not misread as hero regenerate', !wantsRegenerateRapidWriteHeroImage(reviseAllMsg));
ok('revise-all: classified as draft text revision', isRapidWriteDraftTextRevisionMessage(reviseAllMsg));
ok('hero regenerate explicit', wantsRegenerateRapidWriteHeroImage('Regenerate hero image for rw-3 in Rapid Write'));
ok('hero generate explicit', wantsGenerateRapidWriteHeroImages('Generate hero images for all Rapid Write drafts'));

process.exit(failed ? 1 : 0);
