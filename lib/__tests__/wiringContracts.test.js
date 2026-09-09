/**
 * @jest-environment node
 *
 * Structural wiring, checked mechanically.
 *
 * Every one of these guards a class of failure that is invisible in
 * development and silent in production, and every one has already happened:
 *
 *   An endpoint with no route in vercel.json does not 404. It returns the
 *   homepage HTML with a 200. The JSON parse fails somewhere far away and the
 *   feature looks broken for a different reason. x-media-check, linkedin-check
 *   and draft-versions all shipped this way. The last one left the Show Changes
 *   checkbox permanently disabled while Bart was giving section-level notes and
 *   receiving whole-post rewrites.
 *
 *   A tool registered in the model's tool list with no case in the dispatch
 *   switch is worse: the model calls it, gets an unknown-tool result, and
 *   narrates something plausible about what it did.
 *
 *   A page added without all four wiring points renders nothing. Adding
 *   /fractional-roles/cto needed edits in App.jsx twice, seo.json, the sitemap
 *   route list and the marketing verifier. Miss one and the page is invisible
 *   or untitled.
 *
 * These read the source rather than executing it, because the invariant is that
 * two files agree, and mocking the pieces would only assert the mocks agreed.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function walkJs(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walkJs(rel, out);
    } else if (entry.name.endsWith('.js') && !entry.name.includes('.selftest.')) {
      out.push(rel);
    }
  }
  return out;
}

describe('every API endpoint is reachable', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const routes = (cfg.routes || []).map((r) => ({ src: String(r.src || ''), dest: String(r.dest || '') }));

  // Only endpoints with no [param] segment. Dynamic ones are matched by pattern
  // routes and cannot be checked by exact path.
  const statics = walkJs('api').filter((p) => !p.includes('['));

  it('finds a meaningful number of endpoints, so a broken walk cannot pass silently', () => {
    expect(statics.length).toBeGreaterThan(100);
  });

  it.each(statics)('%s has a usable route', (file) => {
    const url = `/${file.replace(/\.js$/, '')}`;
    const reachable = routes.some((r) => {
      if (r.dest === `/${file}`) return true;
      if (r.src === url) return true;
      try {
        return r.src ? new RegExp(`^${r.src}$`).test(url) : false;
      } catch {
        return false; // an unparseable src is the route table's problem, not ours
      }
    });
    expect(reachable).toBe(true);
  });
});

describe('every Auto tool the model can call has a handler', () => {
  const toolSrc = read('lib/ao/autoV2.js');
  const handlerSrc = read('lib/ao/autoToolHandlers.js');

  // Tool names as registered in the model's tool list.
  const registered = [...toolSrc.matchAll(/^\s*name: '([a-z_]+)',$/gm)].map((m) => m[1]);
  // Names the dispatch switch actually handles.
  const dispatched = [...handlerSrc.matchAll(/case '([a-z_]+)':/g)].map((m) => m[1]);

  it('registers a plausible number of tools', () => {
    expect(registered.length).toBeGreaterThan(10);
  });

  // Anthropic server tools resolve inside the API and never reach the client
  // dispatch. web_search is one; listing it as an orphan would be wrong.
  const SERVER_TOOLS = new Set(['web_search']);

  it.each([...new Set(registered)].filter((n) => !SERVER_TOOLS.has(n)))('%s is dispatched', (name) => {
    // A registered tool with no case returns unknown-tool to the model, which
    // then explains what it did anyway.
    expect(dispatched).toContain(name);
  });

  it('has no handler case for a tool the model was never told about', () => {
    // Dead cases are harmless but they mean the list and the switch disagree,
    // which is how the first kind of drift starts.
    const orphans = [...new Set(dispatched)].filter((d) => !registered.includes(d) && !SERVER_TOOLS.has(d));
    expect(orphans).toEqual([]);
  });
});

describe('every public page is wired end to end', () => {
  const app = read('src/App.jsx');
  const seo = JSON.parse(read('src/config/seo.json'));
  const routesModule = read('scripts/lib/public-static-routes.mjs');

  const publicPaths = [...routesModule.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

  it('reads the public route list', () => {
    expect(publicPaths.length).toBeGreaterThan(5);
    expect(publicPaths).toContain('/fractional-roles');
  });

  it.each(publicPaths)('%s resolves to a page in App.jsx', (p) => {
    // The path must appear in the router. Adding a page and forgetting this is
    // how a route renders the wrong component or nothing at all.
    expect(app).toContain(`'${p}'`);
  });

  it('resolves every SEO pageKey a page asks for', () => {
    // seo.json keys are editorial, not derived from the path, so the real
    // failure is a page asking for a key that does not exist. It falls back to
    // the site default and ships with a generic title, which nobody notices
    // until search does.
    const pagesDir = path.join(ROOT, 'src/pages');
    const keys = new Set();
    const collect = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) collect(full);
        else if (e.name.endsWith('.jsx')) {
          for (const m of fs.readFileSync(full, 'utf8').matchAll(/pageKey="([^"]+)"/g)) keys.add(m[1]);
        }
      }
    };
    collect(pagesDir);

    expect(keys.size).toBeGreaterThan(5);
    const missing = [...keys].filter((k) => !seo.pages?.[k]);
    expect(missing).toEqual([]);
  });
});
