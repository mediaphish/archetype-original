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

process.exit(failed ? 1 : 0);
