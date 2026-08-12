/**
 * Structural regression: header-upload trigger must live in the composer path,
 * not only inside ArtifactPanel (which is unreachable when empty).
 *
 * Run: node src/components/ao/headerUploadReachability.selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const panelPath = path.join(ROOT, 'src/components/ao/AutoV2Panel.jsx');
const triggerPath = path.join(ROOT, 'src/components/ao/HeaderUploadToDraftTrigger.jsx');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const panel = fs.readFileSync(panelPath, 'utf8');
const trigger = fs.readFileSync(triggerPath, 'utf8');

assert(fs.existsSync(triggerPath), 'HeaderUploadToDraftTrigger.jsx must exist');
assert(
  /Upload header image directly to draft \(skips chat\)/.test(trigger),
  'trigger component keeps skips-chat label'
);

assert(
  /import HeaderUploadToDraftTrigger/.test(panel),
  'AutoV2Panel must import HeaderUploadToDraftTrigger'
);

// Composer area: the message placeholder, not the empty-state marketing copy.
const talkIdx = panel.indexOf('placeholder="Talk to Auto');
assert(talkIdx > 0, 'composer placeholder present');
const nearby = panel.slice(Math.max(0, talkIdx - 1200), talkIdx + 200);
assert(
  /HeaderUploadToDraftTrigger/.test(nearby),
  'HeaderUploadToDraftTrigger must render in the composer row (near Talk to Auto)'
);

// ArtifactPanel must not be the only home of the file input for this flow.
const artifactFn = panel.indexOf('function ArtifactPanel(');
assert(artifactFn > 0, 'ArtifactPanel exists');
const artifactBlock = panel.slice(artifactFn, artifactFn + 8000);
assert(
  !/data-testid="header-upload-to-draft-input"/.test(artifactBlock),
  'hidden header-upload file input must not live only inside ArtifactPanel'
);
assert(
  !/headerImageInputRef/.test(artifactBlock),
  'ArtifactPanel must not own headerImageInputRef (unreachable when panel closed)'
);

console.log('headerUploadReachability.selftest.mjs: ok');
