# Operators Visual Regression Testing (Plan 3.3)

Visual regression testing for the Operators platform can be added with:

- **Chromatic** (Storybook-based): Add Storybook, then connect Chromatic. Capture components and run visual diffs in CI.
- **Percy** (Percy.io): Add `@percy/cypress` and snapshot key pages in Cypress tests; Percy runs diffs on commit.

## Suggested next steps

1. Choose Chromatic (if using Storybook) or Percy (if using Cypress only).
2. Sign up and get project token.
3. Add token to CI secrets (e.g. `CHROMATIC_PROJECT_TOKEN` or `PERCY_TOKEN`).
4. Add snapshot step to CI (e.g. `npx percy exec -- cypress run` or Chromatic’s `npx chromatic`).
5. Capture Operators pages: Dashboard, Events list, Event detail, Profile, Login.

No code changes are required in the app for Percy (snapshots from Cypress). For Chromatic, add Storybook and stories for Operators components.
