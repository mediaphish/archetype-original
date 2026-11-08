/**
 * One build entry per server program, each packed with only the files it reads
 * (2026-11-08).
 *
 * The site build ran out of memory packing 351 programs because one catch-all
 * rule ("api/**") gave every program the writing files, fonts and brand files,
 * 12 MB each, and built the 38 programs with their own entry a second time.
 * Bart: "a push should not have to push what is already there." Now each
 * program carries the writing files only if its code can reach a reader of
 * them, and fonts and brand files only if it can reach a card or graphic maker.
 *
 *   node scripts/vercel-builds.mjs          check vercel.json is current (build fails if not)
 *   node scripts/vercel-builds.mjs --write  rewrite the generated entries in vercel.json
 *
 * Entries written by hand (memory, time limit, extra files) are kept exactly as
 * they are. Only programs without one get a generated entry.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const WRITING = ['public/knowledge.json', 'public/devotional-schedule.json', 'data/knowledge-full.json'];
const ART = ['public/fonts/**', 'public/brand/**'];
const READS_WRITING = /knowledge-full\.json|knowledge\.json|devotional-schedule\.json/;
const READS_ART = /public['"]?,\s*['"](?:fonts|brand)|public\/(?:fonts|brand)/;
// Imports built from a variable, which a text scan cannot follow.
const HIDDEN_IMPORTS = { 'lib/db/scheduledPosts.js': ['lib/ao/quoteSource.js'] };

const cache = new Map();
function deps(file) {
  if (cache.has(file)) return cache.get(file);
  const out = new Set();
  cache.set(file, out);
  let src = '';
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  const re = /(?:import\s[^'"`;]*?from\s*|import\s*\(\s*(?:\/\*[^*]*\*\/\s*)?|require\s*\(\s*|export\s[^'"`;]*?from\s*)['"`](\.{1,2}\/[^'"`$]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) {
    const p = path.resolve(path.dirname(file), m[1]);
    for (const c of [p, `${p}.js`, `${p}.mjs`, path.join(p, 'index.js')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        out.add(c);
        break;
      }
    }
  }
  for (const extra of HIDDEN_IMPORTS[path.relative(root, file)] || []) out.add(path.join(root, extra));
  return out;
}

function reaches(file, test) {
  const seen = new Set([file]);
  const stack = [file];
  while (stack.length) {
    const f = stack.pop();
    let s = '';
    try {
      s = fs.readFileSync(f, 'utf8');
    } catch {}
    if (test.test(s)) return true;
    for (const d of deps(f)) if (!seen.has(d)) seen.add(d) && stack.push(d);
  }
  return false;
}

export function serverPrograms(dir = path.join(root, 'api')) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') out.push(...serverPrograms(p));
    } else if (/\.js$/.test(e.name) && !/\.test\.js$/.test(e.name)) out.push(path.relative(root, p));
  }
  return out.sort();
}

/** The generated entry for one program. */
export function entryFor(src) {
  const abs = path.join(root, src);
  const includeFiles = ['lib/**'];
  if (reaches(abs, READS_WRITING)) includeFiles.push(...WRITING);
  if (reaches(abs, READS_ART)) includeFiles.push(...ART);
  return { src, use: '@vercel/node', config: { includeFiles } };
}

// The host matches each entry's src as a pattern. Square brackets ([id].js)
// read as a pattern of their own and match nothing, so each becomes "?", and
// the check below proves every program is matched exactly once. The host also
// allows at most 128 entries, so programs that need the same files share one.
const safe = (p) => p.replace(/[[\]]/g, '?');
// The patterns written here are only literal paths, "?" for one character,
// and one {a,b,c} list, so matching needs no library (the host build has none).
const patternRe = (src) =>
  new RegExp(`^(?:${(src.startsWith('{') && src.endsWith('}') ? src.slice(1, -1).split(',') : [src])
    .map((p) => p.replace(/[.+^$()|\\]/g, '\\$&').replace(/\*\*\//g, '(?:.*/)?').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
    .join('|')})$`);
const reCache = new Map();
const matches = (file, src) => {
  if (!reCache.has(src)) reCache.set(src, patternRe(src));
  return reCache.get(src).test(file);
};
const isApi = (b) => b.src.startsWith('api/') || b.src.startsWith('{api/');

function plan(config) {
  const builds = config.builds || [];
  const handWritten = builds
    .filter((b) => !isApi(b) || (!b.src.includes('*') && !b.config?.generatedBy))
    .map((b) => (isApi(b) ? { ...b, src: safe(b.src) } : b));
  const programs = serverPrograms();
  const own = new Set(programs.filter((f) => handWritten.some((b) => isApi(b) && matches(f, b.src))));
  const groups = new Map();
  for (const src of programs.filter((f) => !own.has(f))) {
    const { includeFiles } = entryFor(src).config;
    const key = JSON.stringify(includeFiles);
    if (!groups.has(key)) groups.set(key, { includeFiles, files: [] });
    groups.get(key).files.push(src);
  }
  // The host also caps each src at 4096 characters, so a long list is split.
  const generated = [];
  for (const { includeFiles, files } of groups.values()) {
    let chunk = [];
    const flush = () => {
      if (!chunk.length) return;
      generated.push({
        src: chunk.length === 1 ? safe(chunk[0]) : `{${chunk.map(safe).join(',')}}`,
        use: '@vercel/node',
        config: { includeFiles, generatedBy: 'scripts/vercel-builds.mjs' },
      });
      chunk = [];
    };
    for (const f of files) {
      if (chunk.length && `{${[...chunk, f].map(safe).join(',')}}`.length > 3800) flush();
      chunk.push(f);
    }
    flush();
  }
  return [...handWritten, ...generated];
}

/** Every program matched by exactly one entry, every entry matching something, and under the host's limit. */
function problems(builds) {
  const out = [];
  if (builds.length > 128) out.push(`${builds.length} build entries; the host allows 128`);
  for (const b of builds) if (b.src.length > 4096) out.push(`an entry is ${b.src.length} characters long; the host allows 4096`);
  const api = builds.filter(isApi);
  for (const f of serverPrograms()) {
    const n = api.filter((b) => matches(f, b.src)).length;
    if (n !== 1) out.push(`${f} is matched by ${n} entries`);
  }
  for (const b of api) if (!serverPrograms().some((f) => matches(f, b.src))) out.push(`${b.src.slice(0, 80)} matches no program`);
  return out;
}

const vercelPath = path.join(root, 'vercel.json');
const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
const next = plan(config);
const issues = problems(next);
if (issues.length) {
  console.error(`vercel-builds: ${issues.slice(0, 10).join('; ')}`);
  process.exit(1);
}

if (process.argv.includes('--write')) {
  config.builds = next;
  fs.writeFileSync(vercelPath, `${JSON.stringify(config, null, 2)}\n`);
  const gen = next.filter((b) => b.config?.generatedBy);
  console.log(`vercel-builds: wrote ${next.length} entries; ${gen.length} shared entries cover ${serverPrograms().length - next.filter((b) => isApi(b) && !b.config?.generatedBy).length} programs.`);
} else {
  if (JSON.stringify(next) !== JSON.stringify(config.builds)) {
    console.error('vercel-builds: vercel.json is out of date (a server program was added or now reads different files). Run: node scripts/vercel-builds.mjs --write');
    process.exit(1);
  }
  console.log(`vercel-builds: OK (${next.length} build entries, each server program packed once)`);
}
