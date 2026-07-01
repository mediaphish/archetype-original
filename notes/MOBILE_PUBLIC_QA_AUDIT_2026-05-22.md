# Mobile & Public QA Audit — May 22, 2026

**Site:** https://www.archetypeoriginal.com  
**Viewports tested:** 375, 390, 768, 1024, 1280 px  
**Scope:** All public marketing routes (~28 static), content templates (journal, devotional, podcast), public forms, Archy chat.

---

## Executive summary

| Area | Result |
|------|--------|
| **P0 — Header overlap (tablet)** | Confirmed on live at 768px; **fixed** in `Header.jsx` (hamburger below 1024px, 3-column grid at lg+) |
| **P0 — Broken public forms** | None found — contact, engagement inquiry, journal subscribe, operators interest, guest intake, chat all respond correctly |
| **P1 — Layout** | No true horizontal-scroll breaks; automated “offscreen elements” hits are mostly hidden drawer/Archy chrome (false positives) |
| **Content templates** | Journal post, devotional, podcast episode, ALI marketing, bad-leader, operators landing all load at tested widths |

---

## P0 findings (fixed or verified)

### 1. Header nav overlaps logo at tablet width — **FIXED**

- **Where:** All pages using main `Header.jsx`
- **Viewport:** 768px (tablet portrait)
- **Symptom:** “Leadership Advisory” and other nav labels sat on top of the logo
- **Cause:** Desktop nav appeared at `md` (768px) with absolute centering
- **Fix:** Desktop nav + secondary row + CTA now at `lg` (1024px)+; hamburger/drawer below 1024px; primary row uses `grid` columns (`logo | nav | CTA`) instead of absolute centering
- **Verified locally** (`http://127.0.0.1:4173`): no overlap at 768px; hamburger visible and drawer opens

---

## P1 findings (acceptable / no code change)

### Offscreen interactive elements (automated crawl)

- **Severity:** P1 (downgraded after review)
- **Detail:** Puppeteer reported 5–9 buttons/links past viewport edge on many pages at 768–1280px
- **Assessment:** These are hidden mobile-drawer links, Archy panel controls, and footer items not meant to be visible in the main viewport — not user-facing layout breaks
- **Action:** None

### ALI subnav horizontal scroll

- **Where:** `/culture-science/ali` and related marketing pages
- **Behavior:** Subnav scrolls horizontally on narrow screens (`overflow-x-auto`) — intentional
- **Action:** None

---

## P2 polish (optional later)

- Tap targets on FAQs pagination are slightly tight at 375px (`min-w-[40px]`) — still usable
- Operators landing uses its own nav (not site header) — by design

---

## Page crawl matrix

**Static routes (28):** All returned HTTP 200 at all five viewports. No horizontal scroll detected (`scrollWidth - clientWidth ≤ 2px`).

**Content templates (sample URLs):**

| Template | URL | Result |
|----------|-----|--------|
| Journal post | `/journal/ali-series-introducing-the-archetype-leadership-index` | OK |
| Devotional | `/journal/understanding-in-everything` | OK |
| Podcast episode | `/podcast/season-01-episode-00` | OK — YouTube embed + platform links |
| ALI marketing | `/culture-science/ali` | OK |
| Bad Leader Project | `/culture-science/bad-leader-project` | OK |
| Operators landing | `/operators` | OK (separate nav) |
| ALI signup | `/ali/signup` | OK |

---

## Public interaction tests

| Feature | Result | Notes |
|---------|--------|-------|
| Contact form | PASS | API accepts submission |
| Engagement inquiry | PASS | Full questionnaire fields |
| Journal email subscribe | PASS | Browser + API |
| Podcast guest intake | PASS | Full-field test in prior session (`ao-full-form-test@example.com`) |
| Bad Leader submit | PASS (moderation) | API validates; obvious test/spam text may get 422 reject or flagged — moderation working |
| Operators interest | PASS | Requires 100+ char bio + company size |
| Archy chat (`/api/chat`) | PASS | Returns response |
| Archy mobile panel @ 375px | PASS | FAB opens slide panel |
| Archy desktop @ 1280px | PASS | Panel opens |
| Knowledge API | PASS | 499 docs |

**Test emails safe to delete:** `ao-mobile-qa-*@example.com`, `ao-full-form-test@example.com`, prior Cursor test submissions.

---

## Scripts added (for repeat audits)

- `scripts/mobile-qa-audit.mjs` — viewport crawl + h-scroll + overlap heuristics
- `scripts/mobile-qa-header-check.mjs` — focused 768px header overlap check
- `scripts/mobile-qa-interactions.mjs` — API interaction smoke tests
- `scripts/mobile-qa-browser.mjs` — browser E2E (subscribe, Archy, podcast, hamburger)

Raw JSON: `notes/mobile-qa-audit-results.json`, `notes/mobile-qa-interaction-results.json`, `notes/mobile-qa-browser-results.json`

---

## Post-deploy verification checklist

After deploy of `Header.jsx` fix:

1. [ ] Re-run `node scripts/mobile-qa-header-check.mjs https://www.archetypeoriginal.com` — expect OK at 768px
2. [ ] Spot-check home, guest-intake, culture-science/ali at 768px in browser
3. [ ] Confirm hamburger opens at 768px on live (`node scripts/mobile-qa-browser.mjs`)

---

## Changed files (this QA pass)

- `src/components/Header.jsx` — tablet header fix
- `scripts/mobile-qa-*.mjs` — audit tooling
- `notes/MOBILE_PUBLIC_QA_AUDIT_2026-05-22.md` — this report
