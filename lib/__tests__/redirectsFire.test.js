/**
 * @jest-environment node
 *
 * This project uses Vercel's older builds/routes setup, where the "redirects"
 * list is ignored: on 2026-10-24 /methods, /philosophy and the rest all served
 * the home page instead of forwarding. Every redirect must also exist as a
 * route with a status and Location, placed before the catch-all.
 */
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

test('every redirect has a matching forwarding route ahead of the catch-all', () => {
  const routes = vercel.routes;
  const catchAll = routes.findIndex((r) => r.src === '/(.*)');
  for (const r of vercel.redirects.filter((x) => !x.has)) {
    const i = routes.findIndex((x) => x.headers?.Location === r.destination && new RegExp(x.src).test(r.source));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(catchAll);
    expect(routes[i].status).toBe(r.permanent ? 308 : 307);
  }
});

test('the archived What I Do page forwards to Work with Bart', () => {
  const r = vercel.routes.find((x) => x.headers?.Location === '/work-with-bart');
  expect(new RegExp(r.src).test('/what-i-do')).toBe(true);
  expect(new RegExp(r.src).test('/what-i-do/')).toBe(true);
});
