/**
 * One rule: do not reference a name that is not in scope.
 *
 * 2026-10-16. On October 4 a `const siteUrl` was moved inside a fallback branch
 * while three later lines still used it. Valid syntax, so `node --check` passed,
 * the tests passed, the build passed and the deploy went green. Every morning
 * for ten days the devotional cron claimed the day and then threw
 * "siteUrl is not defined" before sending a single email. Nobody noticed because
 * the GitHub job, the one this was meant to make unnecessary, quietly did the
 * sending instead.
 *
 * no-undef is the tool that catches that class of mistake. The rest is left
 * alone on purpose: this is a guard, not a style pass.
 */
module.exports = {
  root: true,
  env: { node: true, es2023: true },
  // Test files get the jest globals; everything else is plain Node.
  overrides: [
    { files: ['**/__tests__/**', '**/*.test.js', '**/*.test.mjs'], env: { jest: true } },
    // Shared with the browser bundle, so it legitimately touches window.
    { files: ['lib/ao/touchGestures.js'], env: { browser: true } },
  ],
  parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
  rules: { 'no-undef': 'error' },
};
