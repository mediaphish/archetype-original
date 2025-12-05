# ARCHETYPE ORIGINAL — COMPLETE PROJECT STATE SNAPSHOT
**Last Updated:** December 2, 2025  
**Purpose:** Complete state documentation for seamless project resumption after connection loss

---

## 🎯 PROJECT OVERVIEW

**Project Name:** Archetype Original  
**URL:** https://www.archetypeoriginal.com  
**Repository:** https://github.com/mediaphish/archetype-original  
**Deployment:** Vercel (auto-deploys from main branch)  
**Owner:** Bart Paden

**Mission:** ArchetypeOriginal.com is evolving from a personal consulting website into the headquarters of a multi-pillar servant leadership organization. The site supports:
- Mentoring & Consulting (Bart's personal practice)
- Culture Science (research, diagnostics, ALI)
- Leadership Education (philosophy, research, playbooks, journal)
- Archy (the AI leadership engine)
- Anti-Projects (Scoreboard Leadership, The Bad Leader Project)

---

## 🛠️ TECHNICAL STACK

### Frontend
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.8
- **Styling:** Tailwind CSS 3.4.9
- **Routing:** Custom client-side routing (no React Router)
- **SEO:** react-helmet-async 2.0.4
- **Markdown:** gray-matter 4.0.3 (for journal posts)

### Backend
- **Hosting:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend 3.2.0
- **AI:** OpenAI GPT-4 (for chat and threat assessment)

### Development
- **Node Version:** Requires Node.js 18+ (for built-in fetch)
- **Package Manager:** npm
- **Type System:** JavaScript (no TypeScript)

---

## 🎨 DESIGN SYSTEM: EDITORIAL MINIMAL

### Color Palette (Universal - Applied to ALL Pages)
```css
Primary Text: #1A1A1A (Charcoal)
Secondary Text: #6B6B6B (Warm Grey)
Orange Accent: #C85A3C (Archy Orange)
Orange Dark: #B54A32
Off-White Background: #FAFAF9
White Background: #FFFFFF
```

**CRITICAL RULE:** All pages use flat design. NO gradients, NO shadows (except subtle hover effects), NO rounded corners (use `rounded-sm` or no rounding).

### Typography Hierarchy

**Hero H1:**
```jsx
className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-serif tracking-tight"
```

**Page H1:**
```jsx
className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold"
```

**Section H2:**
```jsx
className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold"
```

**Subsection H3:**
```jsx
className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold"
```

**Body Text:**
```jsx
className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]"
```

**Pull Quotes:**
```jsx
className="text-2xl sm:text-3xl md:text-4xl italic font-serif leading-relaxed"
```

**Serif Font:** Georgia (defined in `tailwind.config.js`)

### Component Patterns

**Pull Quotes:**
```jsx
<div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
  <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
    "Quote text here"
  </p>
</div>
```

**Emphasis Box (Orange Border):**
```jsx
<div className="border-2 border-[#C85A3C] bg-white p-8 sm:p-10 md:p-12 space-y-4 sm:space-y-6">
  {/* Content */}
</div>
```

**Primary Button:**
```jsx
className="px-8 sm:px-10 py-4 sm:py-5 bg-[#1A1A1A] text-white font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors"
```

**Secondary Button:**
```jsx
className="px-8 sm:px-10 py-4 sm:py-5 bg-transparent text-[#1A1A1A] font-medium text-sm sm:text-base border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
```

**Section Structure:**
```jsx
<section className="w-full bg-white py-16 sm:py-24 md:py-32">
  <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-4xl">
    {/* Content */}
  </div>
</section>
```

**Alternating Backgrounds:** `bg-white` and `bg-[#FAFAF9]` (off-white)

---

## 📁 FILE STRUCTURE

### Key Directories
```
archetype-original/
├── src/
│   ├── pages/              # Page components
│   │   ├── About.jsx      # ✅ Recently redesigned with parallax hero
│   │   ├── Philosophy.jsx  # ✅ Editorial minimal design
│   │   ├── Methods.jsx
│   │   ├── Journal.jsx    # ✅ 3-column grid with featured article
│   │   ├── JournalPost.jsx # ✅ Enhanced markdown parsing
│   │   ├── Contact.jsx
│   │   ├── cultureScience/
│   │   │   ├── ALI.jsx
│   │   │   ├── ALIApply.jsx
│   │   │   ├── ALIThanks.jsx
│   │   │   └── ...
│   │   ├── mentoring/
│   │   └── archy/
│   ├── components/
│   │   ├── Header.jsx      # Navigation
│   │   ├── FloatingArchyButton.jsx # Fixed bottom-right chat button
│   │   ├── JournalSubscription.jsx # Email subscription form
│   │   └── home/           # Homepage sections
│   ├── app/
│   │   └── ChatApp.jsx     # AI chat interface
│   └── styles/
│       └── index.css       # Global styles + design system
├── api/                    # Vercel serverless functions
│   ├── chat.js
│   ├── contact.js
│   ├── journal/
│   │   ├── subscribe.js    # Email subscription endpoint
│   │   └── notify.js       # Email notification endpoint
│   └── ali/
│       └── apply.js
├── ao-knowledge-hq-kit/
│   └── journal/            # Markdown journal posts
├── scripts/
│   ├── build-knowledge.mjs # Builds knowledge.json corpus
│   └── send-journal-notification.mjs # Manual notification trigger
├── public/
│   ├── images/             # All image assets
│   └── knowledge.json      # Generated knowledge corpus
└── vercel.json             # Vercel configuration
```

---

## 🏠 HOMEPAGE STRUCTURE

**Component Order (in `src/App.jsx`):**
1. `<HomeHero />` - Hero section with parallax
2. `<MeetArchy />` - Chat preview section
3. `<WhatImBuilding />` - Three pillars
4. `<AntiProjects />` - Anti-projects section
5. `<JournalHighlights />` - Featured journal posts
6. `<WhyArchetypeOriginal />` - Two-column with photo
7. `<FinalCTA />` - Closing call-to-action

**Navigation (in `src/components/Header.jsx`):**
- Home | Mentoring | Culture Science | Archy | Journal | About | Contact
- Philosophy and Methods are in main nav (user requested they be brought back)

---

## 📝 JOURNAL SYSTEM

### Current State
- **Total Posts:** 35 published posts (24 existing + 11 new Narcissistic Leadership Tactics series)
- **New Series Added:** 11 posts on Narcissistic Leadership Tactics
  - Post order: Illusion of Control → Performance of Perfection → Cult of Confusion → Shadow of Shame → The Proxy Trap → Manufactured Crisis → The Loyalty Economy → The Scarcity Switch → The Isolation Strategy → The Distraction Play → After the Smoke Clears
  - Publish dates: Starting 2025-11-27, then every Thursday
  - All have takeaways and updated categories

### Journal Page Features
- **Layout:** 3-column grid with featured first article
- **Category Filters:** All, Leadership, Culture, Growth, Philosophy
- **Category Mapping:** Comprehensive mapping of 23+ post categories to 5 display categories
- **Email Subscription:** Form at bottom of page (`JournalSubscription` component)
- **Social Sharing:** Minimal icon-only buttons on individual posts

### Journal Post Features
- **Markdown Parsing:** Enhanced RTF cleaning and frontmatter parsing
- **Inline Markdown:** Processes bold, italic, and links
- **List Styling:** Custom orange bullets (•) with proper spacing
- **Date Parsing:** Handles YYYY-MM-DD format as UTC
- **Email Summaries:** `email_summary` field generated during corpus build (for email notifications)

### Knowledge Corpus Build
- **Script:** `scripts/build-knowledge.mjs`
- **Output:** `public/knowledge.json`
- **Features:**
  - Processes markdown files from `ao-knowledge-hq-kit/journal/`
  - Generates `email_summary` field (cleaned, up to 400 chars)
  - Skips future posts and drafts
  - Runs automatically (hourly/daily via GitHub Actions)

---

## 📧 EMAIL SUBSCRIPTION SYSTEM

### Database Schema
**Table:** `journal_subscriptions` (Supabase)
```sql
CREATE TABLE journal_subscriptions (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### API Endpoints
- **POST `/api/journal/subscribe`** - Subscribe to journal updates
  - Validates email
  - Handles duplicates gracefully (idempotent)
  - Reactivates previously unsubscribed emails
  - Sends confirmation email via Resend

- **POST `/api/journal/notify`** - Send notifications for new posts
  - Accepts `{ postSlug: "slug" }` or `{ post: {...} }`
  - Fetches post from knowledge corpus if needed
  - Sends emails to all active subscribers
  - Includes post title, email_summary, publish date, and link

### Manual Notification Script
```bash
node scripts/send-journal-notification.mjs <post-slug>
```

---

## 🤖 ARCHY CHAT SYSTEM

### Components
- **`FloatingArchyButton.jsx`** - Fixed bottom-right button (all pages)
  - Background color: `#ff801d` (matches image background)
  - Opens chat modal overlay
  - Context-aware based on current page

- **`ChatApp.jsx`** - Main chat interface
  - Accepts `context` prop (home, journal, mentoring, etc.)
  - Accepts `initialMessage` prop
  - Integrates with `/api/chat` endpoint
  - Includes inline contact form for email requests

### API Endpoints
- **POST `/api/chat`** - Main chat endpoint
  - Uses OpenAI GPT-4
  - Context-aware responses
  - AI-based threat assessment
  - Returns `showContactForm: true` when email requested

- **POST `/api/chat/assess-threat`** - AI threat assessment
- **POST `/api/chat/block-threat`** - Block sessions/IPs

### Threat Assessment System
- Multi-layer threat detection
- Temporary and permanent blocking
- IP and session tracking
- Database tables: `blocked_sessions`, `blocked_ips`, `threats`

---

## 🎨 PARALLAX IMPLEMENTATIONS

### Philosophy Page
- **3 Layers:** philosophy-layer-3.png (background), philosophy-layer-2.png (middle), philosophy-layer-1.png (Archy/foreground)
- **Movement:** Layer 3 moves down, Layer 2 moves horizontally, Layer 1 (Archy) moves horizontally only
- **Disabled on mobile:** `< 768px`

### About Page
- **3 Layers:** about-layer-3.png (Monitor/back), about-layer-2.png (Archy/middle), about-layer-1.png (Bart/front)
- **Movement:** 
  - Layer 3 (Monitor): `translateY(${scrollY * -0.12}px)` - floats UP
  - Layer 2 (Archy): `translateY(${scrollY * 0.08}px)` - slight movement
  - Layer 1 (Bart): `translateY(${scrollY * 0.05}px)` - moves slowest
- **Layout:** 2-column grid (text left, parallax right) matching Philosophy page
- **Disabled on mobile:** `< 768px`

---

## 📄 RECENTLY COMPLETED WORK

### About Page Redesign (December 2, 2025)
- ✅ Implemented 3-layer parallax hero (2-column layout)
- ✅ Applied editorial minimal design system
- ✅ Reorganized content into new sections:
  1. Hero with parallax
  2. The Work Found Me (2-column with headshot)
  3. Leadership in the Real World
  4. The Years That Tested Everything (orange-bordered box)
  5. What Defines My Work
  6. How I Show Up Today (engagement types)
  7. Closing CTA
- ✅ Fixed typography to match site design
- ✅ Headshot: `bart-headshot-002.jpg` (object-contain, not cropped)

### Journal Email Subscription (November 26, 2025)
- ✅ Created subscription form component
- ✅ Database schema for `journal_subscriptions`
- ✅ API endpoints for subscribe and notify
- ✅ Email summaries generated during corpus build
- ✅ Manual notification script

### 11 New Journal Posts (November 27, 2025)
- ✅ Added Narcissistic Leadership Tactics series
- ✅ Set publish dates (starting 2025-11-27, every Thursday)
- ✅ Generated takeaways for all posts
- ✅ Updated categories to connect posts
- ✅ All images added to `public/images/`

### Journal Post Improvements
- ✅ Enhanced RTF and frontmatter cleaning
- ✅ Inline markdown processing (bold, italic, links)
- ✅ Custom list styling (orange bullets)
- ✅ Fixed date parsing (UTC handling)
- ✅ Minimal social sharing buttons

### FloatingArchyButton
- ✅ Background color: `#ff801d` (matches image)
- ✅ Fixed bottom-right on all pages
- ✅ Context-aware chat

---

## 🗄️ DATABASE SCHEMAS

### Supabase Tables

**journal_subscriptions:**
- Stores email subscriptions for journal updates
- Schema file: `JOURNAL_SUBSCRIPTIONS_SCHEMA.sql`

**ali_applications:**
- Stores ALI pilot program applications
- Schema file: `ALI_DATABASE_SCHEMA.sql`

**blocked_sessions, blocked_ips, threats:**
- Threat assessment and blocking system
- Schema files: `BLOCKED_SESSIONS_SCHEMA.sql`, `BLOCKED_SESSIONS_MIGRATION.sql`

**conversations:**
- Chat conversation history

---

## 🔌 API ENDPOINTS

All endpoints are Vercel serverless functions in `/api/`:

1. **`/api/chat`** - Main chat endpoint (OpenAI GPT-4)
2. **`/api/contact`** - Contact form submissions (Resend)
3. **`/api/handoff`** - Chat handoff functionality
4. **`/api/knowledge`** - Knowledge corpus queries
5. **`/api/ali/apply`** - ALI application submissions
6. **`/api/journal/subscribe`** - Journal email subscriptions
7. **`/api/journal/notify`** - Send journal post notifications
8. **`/api/chat/assess-threat`** - AI threat assessment
9. **`/api/chat/block-threat`** - Block sessions/IPs

---

## 🔐 ENVIRONMENT VARIABLES

**Required in Vercel:**
- `RESEND_API_KEY` - Email service
- `CONTACT_FROM` - Sender email (e.g., "Archetype Original <noreply@archetypeoriginal.com>")
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key (for chat)
- `VITE_SUPABASE_URL` - Supabase URL (client-side)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (client-side)
- `VITE_CALENDLY_SCHEDULING_URL` - Calendly URL (optional)

---

## 📦 BUILD & DEPLOYMENT

### Build Commands
```bash
npm run build              # Production build
npm run build-knowledge    # Rebuild knowledge corpus
npm run dev                # Development server
```

### Deployment
- **Platform:** Vercel
- **Trigger:** Auto-deploys on push to `main` branch
- **Build Output:** `dist/` directory
- **API Functions:** Auto-detected from `/api/` directory

### Git Workflow
```bash
git add -A
git commit -m "Description"
git push origin main
```

**Note:** Automated scripts may commit to `main` (knowledge corpus updates). Always pull before pushing:
```bash
git pull origin main --no-rebase
git push origin main
```

---

## 🎯 CONTENT PRESERVATION RULE

**CRITICAL:** No content may be deleted or rewritten without explicit instruction. All existing content must be preserved and reorganized into new structures. This includes:
- Homepage content
- Philosophy page content
- Methods page content
- About page content
- Journal posts
- Research summaries
- Quotes
- CTA blocks

---

## 🖼️ IMAGE ASSETS

### Parallax Images
- **Philosophy:** `philosophy-layer-1.png`, `philosophy-layer-2.png`, `philosophy-layer-3.png`
- **About:** `about-layer-1.png` (Bart), `about-layer-2.png` (Archy), `about-layer-3.png` (Monitor)

### Profile Photos
- **About Page:** `bart-headshot-002.jpg` (portrait, city street background)

### Journal Post Images
- All journal posts have corresponding images in `public/images/`
- Format: `{slug}.jpg` or `{slug}.png`
- New series images: `illusion-of-control.jpg`, `performance-of-perfection.jpg`, `cult-of-confusion.jpg`, etc.

### Archy Images
- **Avatar:** `archy-avatar.png` (used in FloatingArchyButton and chat)
- **Border:** No border on avatar images (`border-0` class)

---

## 🚨 KNOWN ISSUES & CONSTRAINTS

### User Rules
1. **User is NOT an engineer** - Provide detailed, step-by-step instructions
2. **All files delivered in full** - User does not edit lines of code
3. **Changes must be presented and approved** before action
4. **List changed files** at bottom of each action for commit/deploy

### Technical Constraints
- **No React Router** - Custom client-side routing in `App.jsx`
- **Mobile-first** - All layouts must be mobile-responsive
- **Parallax disabled on mobile** - Performance consideration
- **Flat design only** - No gradients or shadows (except subtle hovers)
- **Content verbatim** - Do not modify copy without explicit instruction

### Git Considerations
- Automated scripts may commit hourly/daily (knowledge corpus)
- Always pull before pushing to avoid conflicts
- Use `--no-rebase` for pull merges

---

## 📋 CURRENT PROJECT STATUS

### ✅ Completed Features
- Homepage redesign (editorial minimal)
- Philosophy page (parallax hero, editorial minimal)
- About page (parallax hero, editorial minimal)
- Journal page (3-column grid, category filters)
- Journal post enhancements (markdown, social sharing)
- Email subscription system
- Email notification system
- FloatingArchyButton (context-aware)
- Chat system with threat assessment
- 11 new journal posts (Narcissistic Leadership Tactics series)

### 🔄 In Progress
- None currently

### 📝 Pending/Planned
- Methods page may need editorial minimal styling update
- Content extraction files exist for ChatGPT rework (About, Philosophy, Methods)

---

## 🔗 KEY LINKS & RESOURCES

- **Production Site:** https://www.archetypeoriginal.com
- **GitHub Repo:** https://github.com/mediaphish/archetype-original
- **Vercel Dashboard:** (user has access)
- **Supabase Dashboard:** (user has access)

---

## 📝 CONTENT FILES FOR CHATGPT

These files contain extracted content for ChatGPT to rework:
- `ABOUT_PAGE_CONTENT_FOR_CHATGPT.md`
- `PHILOSOPHY_PAGE_CONTENT_FOR_CHATGPT.md`
- `METHODS_PAGE_CONTENT_FOR_CHATGPT.md`

**Note:** These are reference files only. Do not modify actual page content without user approval.

---

## 🎯 WORKFLOW REMINDERS

1. **Always read files before editing** - Use `read_file` tool
2. **Check for linter errors** - Use `read_lints` after changes
3. **Test build** - Run `npm run build` before committing
4. **List changed files** - At bottom of response for user
5. **Pull before push** - Avoid merge conflicts
6. **Preserve content** - Never delete or rewrite without instruction
7. **Mobile-first** - Test responsive layouts
8. **Flat design** - No gradients, shadows, or excessive rounding

---

## 🚀 QUICK START COMMANDS

```bash
# Navigate to project
cd /Users/mediaphish/archetype-original

# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Rebuild knowledge corpus
npm run build-knowledge

# Send journal notification manually
node scripts/send-journal-notification.mjs <post-slug>

# Git workflow
git add -A
git commit -m "Description"
git pull origin main --no-rebase
git push origin main
```

---

## 📌 CRITICAL DESIGN DECISIONS

1. **Editorial Minimal Design System** - Applied universally to all pages
2. **Flat Design** - No gradients or shadows (except subtle hovers)
3. **Serif for Headings** - Georgia font for all H1, H2, H3
4. **Sans-serif for Body** - System fonts for body text
5. **Orange Accent** - `#C85A3C` used sparingly for borders and accents
6. **Mobile-first** - All layouts responsive, parallax disabled on mobile
7. **Content Preservation** - Never delete or rewrite content without explicit instruction

---

## 🎨 TYPOGRAPHY EXAMPLES

**Hero H1 (About Page):**
```jsx
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
  About Bart
</h1>
```

**Hero H2 (About Page):**
```jsx
<h2 className="text-4xl sm:text-5xl md:text-6xl font-sans font-normal text-[#1A1A1A] mb-6 sm:mb-8 leading-tight">
  Thirty-two years building companies and growing people.
</h2>
```

**Section H2:**
```jsx
<h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-8 sm:mb-10 tracking-tight">
  Section Title
</h2>
```

**Pull Quote:**
```jsx
<div className="border-l-4 border-[#C85A3C] pl-8 sm:pl-10 my-12 sm:my-16">
  <p className="text-2xl sm:text-3xl md:text-4xl italic font-serif text-[#1A1A1A] leading-relaxed">
    "Quote text here"
  </p>
</div>
```

---

## 🔍 DEBUGGING TIPS

### Common Issues
1. **Build failures** - Check for syntax errors, missing imports
2. **Parallax not working** - Verify mobile detection, check scroll handler
3. **Images not loading** - Check paths, verify files exist in `public/images/`
4. **Markdown not rendering** - Check RTF cleaning, verify markdown syntax
5. **Git conflicts** - Always pull before push, resolve conflicts manually

### Useful Commands
```bash
# Check for lint errors
npm run lint

# Check build output
npm run build

# View recent commits
git log --oneline -10

# Check file structure
ls -la src/pages/
ls -la public/images/
```

---

## 📚 ADDITIONAL NOTES

- **Journal posts** are stored as markdown in `ao-knowledge-hq-kit/journal/`
- **Knowledge corpus** is auto-generated to `public/knowledge.json`
- **Email summaries** are generated during corpus build (not visible in browsers)
- **FloatingArchyButton** appears on all pages (fixed bottom-right)
- **Chat is context-aware** - Different responses based on current page
- **All pages use editorial minimal design** - Consistent typography and colors

---

**END OF STATE SNAPSHOT**

*This document should be updated whenever significant changes are made to the project structure, design system, or key features.*


