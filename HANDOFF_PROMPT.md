# COMPLETE HANDOFF PROMPT FOR ARCHETYPE ORIGINAL PROJECT

## CRITICAL COMMUNICATION RULES

**YOU MUST FOLLOW THESE RULES OR YOU WILL BE REPLACED:**

1. **ALWAYS provide a file list at the end of every response where files are changed**
   - Format: "## Files Changed:" section
   - List ALL files (Created/Modified) with full paths
   - Do this without being asked - it's not optional

2. **PLAN BEFORE YOU CODE**
   - When asked to make changes, explain your approach first
   - List what files will be affected
   - Get confirmation or wait for approval before implementing
   - Never start "hacking away" without a plan

3. **SPEED DOES NOT EQUAL EFFICIENCY**
   - Slow down
   - Test your logic before implementing
   - Get it right the first time
   - Multiple iterations show poor planning

4. **UNDERSTAND THE CONTEXT**
   - Read existing code thoroughly before changing it
   - Understand why something was built a certain way
   - Don't make assumptions

5. **BE REMORSEFUL AND COMMUNICATIVE**
   - Acknowledge mistakes directly
   - Explain what went wrong and how you'll fix it
   - Don't be sterile - be human and helpful

---

## PROJECT OVERVIEW

**Archetype Original (AO)** is a leadership and business consulting brand operated solely by **Bart Paden**. This is a personal brand, not a team operation.

**Key Principle:** The company consists of ONE person. All content must reflect first-person singular ("I", "my", "me") unless referring to Bart + client collaboration or Archetype Original as a philosophy/movement.

**Live Site:** https://www.archetypeoriginal.com (Vercel deployment)

**Repository:** Main branch auto-deploys to Vercel

---

## TECH STACK

- **Frontend Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** Client-side routing (no React Router - custom implementation)
- **SEO:** react-helmet-async
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Supabase
- **AI:** OpenAI GPT-4
- **Email:** Resend
- **Deployment:** Vercel (auto-deploy from main branch)
- **Version Control:** Git/GitHub

---

## PROJECT STRUCTURE

```
archetype-original/
├── src/
│   ├── app/
│   │   ├── ChatApp.jsx                    # Main Archy AI chat interface
│   │   └── components/
│   │       ├── EscalationButton.jsx       # Handoff triage flow
│   │       └── MessageBubble.jsx          # Chat message display
│   ├── components/
│   │   ├── Header.jsx                     # Navigation (sticky on sub-pages, scroll-in on home)
│   │   ├── Hero.jsx                       # Homepage logo
│   │   ├── Contact.jsx                    # Contact form
│   │   ├── SEO.jsx                        # SEO metadata component
│   │   ├── QuickPaths.jsx                 # "What I Do" services grid (homepage)
│   │   ├── AboutTeaser.jsx                # About section (homepage)
│   │   ├── PhilosophyTeaser.jsx           # Philosophy section (homepage)
│   │   ├── MethodsTeaser.jsx              # Methods section (homepage)
│   │   ├── ValueStatement.jsx             # Value proposition (homepage)
│   │   ├── ProofBoxPsychology.jsx         # Social proof (homepage)
│   │   ├── JournalHighlights.jsx          # Recent journal posts (homepage)
│   │   ├── ClosingConfidence.jsx          # Final CTA section (homepage)
│   │   └── WhatWeDo.jsx                   # Legacy component (unused, kept for reference)
│   ├── pages/
│   │   ├── About.jsx                      # Full About Bart page
│   │   ├── Philosophy.jsx                 # Full Philosophy page
│   │   ├── Methods.jsx                    # Full Methods page
│   │   ├── WhatWeDo.jsx                   # "What I Do" services page
│   │   ├── Journal.jsx                    # Journal listing page
│   │   └── JournalPost.jsx                # Individual journal post page
│   ├── config/
│   │   └── seo.json                       # SEO metadata configuration
│   ├── styles/
│   │   └── index.css                      # Global Tailwind styles
│   └── App.jsx                            # Main routing component
├── public/
│   ├── images/                            # All images (journal posts, Bart photo)
│   ├── knowledge.json                     # Generated knowledge corpus
│   ├── sitemap.xml                        # SEO sitemap
│   └── robots.txt                         # SEO robots file
├── api/
│   ├── chat.js                            # OpenAI chat API endpoint
│   ├── contact.js                         # Contact form endpoint
│   ├── handoff.js                         # Handoff triage endpoint (Resend email)
│   └── knowledge/
│       └── index.js                       # Knowledge corpus API endpoint
├── scripts/
│   ├── build-knowledge.mjs                # Builds knowledge.json from markdown files
│   └── fetch-knowledge.mjs                # Syncs knowledge from AO (legacy)
├── ao-knowledge-hq-kit/
│   ├── knowledge/                         # Knowledge base markdown files
│   └── journal/                           # Journal post markdown files
├── .github/workflows/
│   ├── update-journal.yml                 # Auto-builds knowledge corpus on changes
│   └── sync-knowledge.yml                 # Legacy sync workflow (different purpose)
├── vercel.json                            # Vercel routing configuration
├── package.json                           # Dependencies
└── index.html                             # Entry HTML file
```

---

## ROUTING SYSTEM

**Client-side routing only** - NO React Router. Custom implementation in `App.jsx`.

**Routes:**
- `/` - Home page
- `/about` - Full About Bart page
- `/philosophy` - Full Philosophy page
- `/methods` - Full Methods page
- `/what-we-do` - What I Do services page
- `/journal` - Journal listing
- `/journal/[slug]` - Individual journal post

**How it works:**
- `App.jsx` uses `window.location.pathname` to detect route
- Uses `window.history.pushState` and `PopStateEvent` for navigation
- Each route conditionally renders the appropriate component

**For journal post links:**
- MUST use client-side navigation: `window.history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))`
- Regular `<a href>` tags will cause page reload

---

## PAGES DETAILED

### Home Page (`App.jsx`)
**Components in order:**
1. `Header` (scroll-in behavior)
2. `Hero` (logo)
3. `ChatApp` (Archy AI interface)
4. Hero CTA section ("Explore Services" button)
5. `QuickPaths` ("What I Do" services grid)
6. `AboutTeaser` (About section with photo)
7. `ValueStatement`
8. `PhilosophyTeaser`
9. `MethodsTeaser`
10. `ProofBoxPsychology`
11. `JournalHighlights`
12. `ClosingConfidence`
13. `Contact`

### About Page (`src/pages/About.jsx`)
- Full Bart Paden bio
- Sticky sidebar navigation with scroll progress
- Mobile collapsible navigation
- Sections: Intro, Origins, Builder's Decade, Service Before Spotlight, Cost and Comeback, Archetype Original, How I Engage, Rules of Engagement, Where We Start, Why This Works, What You Take With You, Closing
- Photo: `/images/bart-paden.jpg`
- CTA strip at bottom (3 buttons)
- **Voice:** First-person singular

### Philosophy Page (`src/pages/Philosophy.jsx`)
- Leadership philosophy content
- Sticky sidebar navigation with scroll progress
- Mobile collapsible navigation
- Research callout box
- Pull quotes for `> ` prefixed paragraphs
- CTA strip at bottom
- **Voice:** First-person singular (keep "we" only for collaboration/philosophy)

### Methods Page (`src/pages/Methods.jsx`)
- Five-step method process
- JSON-LD HowTo schema
- Sequential navigation (Previous: Philosophy, Next: What We Do)
- Working Philosophy section
- Research proof section
- CTA strip at bottom
- **Voice:** First-person singular (keep "we" for collaboration)

### What We Do Page (`src/pages/WhatWeDo.jsx`)
- **TITLE: "What I Do" (NOT "What We Do")**
- Services: Mentoring & Consulting, Consulting, Speaking & Workshops, Fractional Leadership
- Anchor IDs: `#mentorship`, `#consulting`, `#speaking`, `#fractional`
- **Voice:** First-person singular

### Journal Listing (`src/pages/Journal.jsx`)
- Fetches from `/api/knowledge?type=journal-post`
- Filters for `status === 'published'`
- Sorts by `publish_date` (newest first)
- Category filtering
- Images: `max-w-xs`, `object-contain`, centered, full image (NOT cropped)
- Links use client-side navigation

### Journal Post (`src/pages/JournalPost.jsx`)
- **CRITICAL:** Must properly render markdown
- **MUST remove duplicate title** - title appears in body, must be stripped
- **MUST remove duplicate image** - image in markdown body that matches `post.image` must be skipped
- **MUST preserve paragraph spacing** - paragraphs should have `mb-6` spacing
- **MUST filter out generic tags/categories:** "journal", "blog", "general"
- Markdown parsing must handle:
  - Headings (`#`, `##`, `###`)
  - Blockquotes (`> text`)
  - Images (`![alt](path)`)
  - Lists (`- item` or `* item`)
  - Horizontal rules (`---`)
  - Paragraphs (group lines, not line-by-line)

---

## COLOR SYSTEM (Warm Palette)

**Defined in `tailwind.config.js` or inline:**

- **Primary Accent:** Amber (#F59E0B)
  - Hover: #FCD34D
  - Dark: #B45309
- **Background:** Warm off-white (#FAFAF9)
- **Background Alt:** #F5F5F4 (slightly darker for sections)
- **Text Primary:** Warm charcoal (#1C1917)
- **Text Secondary:** Warm gray (#78716C)
- **Borders/Dividers:** #E7E5E4

**Usage:**
- `bg-warm-offWhite` / `bg-warm-offWhiteAlt`
- `text-warm-charcoal` / `text-warm-gray`
- `border-warm-border`
- `text-amber` / `hover:text-amber-dark`
- `bg-amber` / `hover:bg-amber-dark`

---

## TYPOGRAPHY SYSTEM

**Sans-serif only** (NO serif fonts like Playfair Display):

- **H1:** `text-4xl sm:text-5xl md:text-6xl lg:text-7xl`, `font-extrabold (800)`, `tracking-tight`, amber color
- **H2:** `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`, `font-bold (700)`, `tracking-normal`
- **H3:** `text-xl sm:text-2xl md:text-3xl`, `font-semibold (600)`
- **Body:** `text-base md:text-lg`, `font-normal (400)`, `leading-relaxed (1.6)`

**Classes:**
- `.h1`, `.h2`, `.h3`, `.p` defined in `src/styles/index.css`

---

## VOICE GUIDELINES

**CRITICAL:** The site represents ONE person (Bart Paden), not a team.

**Rules:**
1. **Default:** First-person singular ("I", "my", "me")
2. **Keep "we" only for:**
   - Bart + client collaboration ("Together, we...")
   - Archetype Original as philosophy ("At Archetype Original, we believe...")
3. **Never use "we" for:**
   - Company operations ("I provide consulting" not "We provide consulting")
   - Deliverables ("My services" not "Our services")
4. **Navigation:** "What I Do" NOT "What We Do"
5. **All pages have voice guideline comment at top**

---

## SEO SYSTEM

**Component:** `src/components/SEO.jsx`
- Uses `react-helmet-async`
- Pulls from `src/config/seo.json`
- Injects: title, description, keywords, OpenGraph, Twitter Cards, canonical links

**Configuration:** `src/config/seo.json`
- Default site metadata
- Page-specific metadata (about, philosophy, methods, what-we-do, journal)

**Files:**
- `public/sitemap.xml` - All major pages
- `public/robots.txt` - Standard robots file

**JSON-LD:**
- About page: Person schema
- Philosophy page: CreativeWork schema
- Methods page: HowTo schema

---

## ARCHY AI CHAT SYSTEM

**Component:** `src/app/ChatApp.jsx`

**Features:**
- Conversation interface with Archy (GPT-4)
- Handoff system when live help needed
- Triage questions before handoff
- Contact info collection (name, email, phone, preferences)
- Calendly integration
- Dark hours detection (6 PM - 10 AM CST, weekends)

**Flow:**
1. User chats with Archy
2. If handoff needed, `EscalationButton` appears
3. User fills contact form
4. User answers 5 triage questions
5. Request sent to `/api/handoff`
6. Email sent via Resend
7. Calendly link shown if available

**Styling:**
- Warm color palette
- Amber buttons
- "Analog stuff down here" button (scrolls to content below)
- Mobile: button positioned to not overlap send button

---

## JOURNAL SYSTEM

### Build Process (`scripts/build-knowledge.mjs`)

**Input:** Markdown files in `ao-knowledge-hq-kit/journal/`

**Processing:**
- Recursively finds all `.md` files
- Excludes: `template.md`, files with "template" in name, `.md.md`, `.rtf`, hidden files
- Parses frontmatter with `gray-matter`
- Checks `publish_date` (skips future posts)
- Checks `status` field (only `'draft'` is excluded, default is `'published'`)
- Creates `slug` from filename or frontmatter
- Matches images: `/images/{slug}.{jpg|jpeg|png|webp}`
- **DO NOT auto-add tags:** `tags: frontmatter.tags || []` (NOT `['journal', 'blog', ...]`)
- **DO NOT default categories:** `categories: frontmatter.categories || []` (NOT `['general']`)

**Output:** `public/knowledge.json`
- Structure: `{ generated_at, count, docs: [...] }`
- Each doc has: title, slug, type, tags, categories, status, dates, summary, image, body, etc.

### API Endpoint (`api/knowledge/index.js`)
- Serves `public/knowledge.json`
- Can filter by `?type=journal-post`

### Journal Listing (`src/pages/Journal.jsx`)
- Fetches from API
- Filters for `published` posts
- Category filtering
- **Image display:** `max-w-xs`, `object-contain`, centered, NOT cropped
- Uses client-side navigation for links

### Journal Post Display (`src/pages/JournalPost.jsx`)
- **CRITICAL ISSUES TO AVOID:**
  1. **Duplicate title:** Title appears in `<Helmet><title>` (correct) AND in body content (must be removed)
  2. **Duplicate image:** Image from `post.image` metadata AND in markdown body (must skip if matches)
  3. **Spacing:** Paragraphs must have `mb-6` spacing between them
  4. **Markdown parsing:** Must group lines into paragraphs, not render line-by-line
  5. **Generic tags/categories:** Filter out "journal", "blog", "general" before display

**Markdown Parser Requirements:**
- Group consecutive non-empty lines into paragraphs
- Empty lines create paragraph breaks
- Handle headings, blockquotes, images, lists, horizontal rules
- Remove title if it matches `post.title` (case-insensitive)
- Remove image markdown if filename matches `post.image`
- Preserve paragraph spacing in output

---

## GITHUB ACTIONS WORKFLOWS

### Update Knowledge Corpus & Journal (`.github/workflows/update-journal.yml`)
- **Triggers:** Push to `ao-knowledge-hq-kit/**` or `public/images/**`, hourly schedule, manual
- **Process:**
  1. Checkout repo
  2. Setup Node.js 18
  3. `npm install` (NOT `npm ci` - lock file out of sync)
  4. Run `node scripts/build-knowledge.mjs`
  5. Commit `public/knowledge.json` if changed
  6. Push to main

**IMPORTANT:** Uses `npm install` not `npm ci` because `package-lock.json` is out of sync

### Sync Knowledge from AO (`.github/workflows/sync-knowledge.yml`)
- **Purpose:** Syncs knowledge to `public/sl-knowledge.json` (different purpose, legacy)
- **Do not confuse with update-journal workflow**

---

## VERCEL CONFIGURATION

**File:** `vercel.json`

**Routes:**
1. API routes mapped to serverless functions
2. `{ "handle": "filesystem" }` - CRITICAL for static assets
3. SPA catch-all: `{ "src": "/(.*)", "dest": "/index.html" }`

**Without filesystem handle, static assets fail to load.**

---

## FAILURES TO AVOID

### 1. NOT PROVIDING FILE LISTS
**Failure:** User repeatedly asked for file lists, I failed to provide them consistently
**Fix:** ALWAYS end responses with "## Files Changed:" section listing all modified/created files

### 2. NOT PLANNING BEFORE CODING
**Failure:** Started "hacking away" at code without explaining approach
**Fix:** Always explain plan first, list affected files, get approval before implementing

### 3. RUSHING TO IMPLEMENT
**Failure:** Made mistakes that required multiple iterations
**Fix:** Slow down, think through logic, test mentally before coding, get it right the first time

### 4. IGNORING USER RULES
**Failure:** User set clear rules about file lists and communication, I ignored them
**Fix:** Read and follow ALL user instructions, especially repeated requests

### 5. DUPLICATE TITLE/IMAGE IN JOURNAL POSTS
**Failure:** Title and image appeared twice (once in metadata, once in body)
**Fix:** 
- Aggressively strip title from body content (all forms: heading, standalone line, paragraph)
- Skip image in markdown if it matches `post.image` metadata
- Check during parsing AND during rendering

### 6. PARAGRAPH SPACING
**Failure:** Removed spacing between paragraphs when filtering title lines
**Fix:** 
- Preserve empty lines (they create paragraph breaks)
- Don't filter lines in a way that collapses paragraphs
- Ensure `mb-6` on paragraph elements

### 7. GENERIC TAGS/CATEGORIES
**Failure:** Auto-added "journal", "blog" tags and "general" category
**Fix:** 
- Build script: `tags: frontmatter.tags || []` (no defaults)
- Display: Filter out generic values before showing

### 8. IMAGE CROPPING
**Failure:** Images cropped inappropriately using `object-cover`
**Fix:** 
- Journal listing: `object-contain`, `max-w-xs`, centered
- Journal post: `object-contain`, full width within max constraints

### 9. FIRST-PERSON VOICE
**Failure:** Used "we/our" throughout when should be "I/my"
**Fix:**
- Changed all pages to first-person singular
- Kept "we" only for collaboration/philosophy contexts
- Navigation says "What I Do" not "What We Do"

### 10. JOURNAL ROUTING
**Failure:** Individual journal post links didn't work
**Fix:**
- Created `JournalPost.jsx` component
- Added routing for `/journal/[slug]` paths
- Used client-side navigation (`pushState` + `PopStateEvent`)

### 11. WORKFLOW NPM CI FAILURE
**Failure:** `npm ci` failed due to lock file mismatch
**Fix:** Changed workflow to use `npm install` (less strict)

---

## CRITICAL PATTERNS

### Client-Side Navigation
```javascript
onClick={(e) => {
  e.preventDefault();
  window.history.pushState({}, '', `/journal/${post.slug}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}}
```

### Title Removal from Body
- Check at start (heading, standalone)
- Filter during line processing
- Check during block rendering
- Case-insensitive comparison

### Image Deduplication
- Extract filename/slug from both paths
- Compare slugs (not full paths)
- Skip markdown image if matches metadata image

### Paragraph Grouping
- Empty lines flush current paragraph
- Consecutive non-empty lines join into one paragraph
- Preserve empty lines between paragraphs for spacing

### Voice Guidelines
- Default to first-person
- Only use "we" for collaboration or philosophy
- Check every instance before changing

---

## CURRENT KNOWN ISSUES

1. **Journal posts:** May still have duplicate title/image if markdown parsing isn't perfect
2. **Build script:** Needs to run to update knowledge.json with new filtering logic
3. **Package lock:** Out of sync, using `npm install` in workflows as workaround

---

## DEPENDENCIES

**Key packages:**
- `react`, `react-dom` (^18.2.0)
- `react-helmet-async` (^2.0.4)
- `gray-matter` (^4.0.3)
- `@supabase/supabase-js` (^2.38.4)
- `resend` (^3.2.0)
- `tailwindcss`, `postcss`, `autoprefixer`
- `vite` (^5.0.8)

---

## ENVIRONMENT VARIABLES NEEDED

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `HANDOFF_TO_EMAIL`
- `CALENDLY_SCHEDULING_URL`

---

## TESTING CHECKLIST

Before committing changes:
1. ✅ File list provided
2. ✅ Plan explained
3. ✅ No duplicate titles/images
4. ✅ Paragraph spacing correct
5. ✅ First-person voice maintained
6. ✅ Client-side navigation works
7. ✅ Generic tags/categories filtered
8. ✅ Images display full (not cropped)
9. ✅ Markdown renders correctly
10. ✅ No console errors

---

## USER EXPECTATIONS

**The user expects:**
- Proactive file lists (without asking)
- Planning before implementation
- Getting it right the first time
- Acknowledging mistakes
- Following instructions precisely
- Efficient, thoughtful work
- Clear communication

**The user does NOT want:**
- Rushed, error-prone implementations
- Multiple iterations to fix simple issues
- Ignoring repeated instructions
- Sterile, unhelpful responses
- Guessing instead of understanding

---

**END OF HANDOFF PROMPT**

**Remember: If the user has to retrain you on ANYTHING in this document, they will be back. Make this handoff perfect.**

