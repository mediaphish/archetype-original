/**
 * Rapid Write seed parser regression. Run: node scripts/rapid-write-regression.mjs
 */

import {
  parseRapidWriteSeeds,
  wantsRapidWriteActivation,
  wantsExitRapidWrite,
  wantsRapidWriteAgentTraining,
} from '../lib/ao/rapidWriteMode.js';

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
const p = parseRapidWriteSeeds(msg);
ok('parse ok', p.ok && p.seeds.length === 1 && p.seeds[0].id === 'a');
ok('exit phrase', wantsExitRapidWrite('Exit Rapid Write'));
ok('agent training line', wantsRapidWriteAgentTraining('Agent Training:\nUse shorter sentences.'));

process.exit(failed ? 1 : 0);
