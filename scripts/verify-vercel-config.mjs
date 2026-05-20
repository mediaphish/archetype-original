import fs from 'fs';
import path from 'path';

const vercelPath = path.join(process.cwd(), 'vercel.json');

if (!fs.existsSync(vercelPath)) {
  console.error('vercel.json is missing.');
  process.exit(1);
}

const raw = fs.readFileSync(vercelPath, 'utf8');
let config;

try {
  config = JSON.parse(raw);
} catch (error) {
  console.error(`vercel.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

const hasBuilds = Array.isArray(config.builds);
const hasFunctions =
  !!config.functions &&
  typeof config.functions === 'object' &&
  !Array.isArray(config.functions) &&
  Object.keys(config.functions).length > 0;

if (hasBuilds && hasFunctions) {
  console.error(
    'Invalid vercel.json: do not define both "builds" and "functions". ' +
      'This project uses "builds"; move any per-function settings into the matching build entry instead.'
  );
  process.exit(1);
}

console.log(
  `verify-vercel-config: OK (builds=${hasBuilds ? 'present' : 'absent'}, functions=${hasFunctions ? 'present' : 'absent'})`
);
