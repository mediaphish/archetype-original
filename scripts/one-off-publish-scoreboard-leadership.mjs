/**
 * One-off emergency publish for scoreboard-leadership.
 * Calls the real api/ao/auto/publish-journal.js handler in-process.
 * Delete after use is optional.
 */
import fs from 'fs';
import path from 'path';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const DRAFT_ID = 'f0d6b7aa-cdf6-44eb-bcd1-51011082ded8';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildOwnerCookie() {
  const email = (process.env.AO_OWNER_EMAIL || '').toLowerCase().trim();
  const secret = process.env.AO_SESSION_SECRET || '';
  if (!email || !secret) throw new Error('AO_OWNER_EMAIL or AO_SESSION_SECRET missing');
  const now = Date.now();
  const payload = {
    email,
    role: 'owner',
    iat: now,
    exp: now + 60 * 60 * 1000,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `ao_session=${encodeURIComponent(`${payloadB64}.${signature}`)}`;
}

function futureCaptionTimes(now = new Date()) {
  // Prompt slots IG/FB 17:30Z, X 18:00Z, LI 20:00Z — recompute if past.
  const day = now.toISOString().slice(0, 10);
  const mk = (h, m) => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
  let igFb = mk(17, 30);
  let tw = mk(18, 0);
  let li = mk(20, 0);
  if (igFb <= now || tw <= now) {
    // Keep relative order: IG/FB → Twitter (+30m) → LinkedIn (+30m after Twitter or keep 20:00 if still ahead)
    const base = new Date(now.getTime() + 25 * 60 * 1000);
    base.setUTCSeconds(0, 0);
    // Round up to next :00 or :30
    const mins = base.getUTCMinutes();
    if (mins > 0 && mins <= 30) base.setUTCMinutes(30);
    else if (mins > 30) {
      base.setUTCHours(base.getUTCHours() + 1);
      base.setUTCMinutes(0);
    }
    igFb = new Date(base);
    tw = new Date(igFb.getTime() + 30 * 60 * 1000);
    li = new Date(tw.getTime() + 30 * 60 * 1000);
    // If original LI 20:00 is still after Twitter, prefer keeping it for the planned evening slot
    const originalLi = mk(20, 0);
    if (originalLi > tw) li = originalLi;
  }
  return {
    instagram_business: igFb.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    facebook_business: igFb.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    twitter: tw.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    linkedin_personal: li.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

function buildSocialCaptionsBlock(times) {
  return `[SOCIAL_CAPTIONS]
[CAPTION platform="linkedin_personal" scheduled_time="${times.linkedin_personal}"]John Stumpf built Wells Fargo's reputation on a phrase: Eight is Great. Eight products in every customer's hands. For years it worked exactly as advertised, right up until employees started manufacturing the numbers they couldn't hit honestly.

Two employees, Yesenia Guitron and Claudia Ponce de Leon, used the company's own ethics hotline to report what they saw. Both were fired. It took years and a federal order to get one of them reinstated. Congress didn't ask Stumpf a single question until long after that.

I call this Scoreboard Leadership. Transactional leadership with the morality engineered out. The number becomes the mission, and the people closest to the truth get removed for telling it. This is Part 2 of a series I'm building at ScoreboardLeadership.com, and it doesn't stay contained to companies. It shows up in marriages, friendships, anywhere a relationship quietly starts running on a ledger instead of a bond.

Where has a scoreboard replaced a mission in something you're responsible for?

archetypeoriginal.com/journal/scoreboard-leadership

#ServantLeadership #Leadership #ScoreboardLeadership #Accountability #ArchetypeOriginal[/CAPTION]
[CAPTION platform="instagram_business" scheduled_time="${times.instagram_business}"]Two Wells Fargo employees used the company's own ethics hotline to report the fraud. Both got fired for it. This is what happens when a number replaces a mission.

#ScoreboardLeadership #ServantLeadership #Leadership #ArchetypeOriginal #Accountability #WorkCulture #LeadershipMatters[/CAPTION]
[CAPTION platform="facebook_business" scheduled_time="${times.facebook_business}"]Wells Fargo called it Eight is Great, eight products in every customer's hands. For years it worked. Then employees started manufacturing the numbers they couldn't hit honestly, and the two people who tried to report it got fired for it. We're calling this pattern Scoreboard Leadership. Read the full piece and tell us, where have you seen a number replace a mission?

archetypeoriginal.com/journal/scoreboard-leadership

#ScoreboardLeadership #Leadership #Accountability #ArchetypeOriginal[/CAPTION]
[CAPTION platform="twitter" scheduled_time="${times.twitter}"]Two Wells Fargo employees reported the fraud through the company's own ethics hotline. Both got fired. That's Scoreboard Leadership.

archetypeoriginal.com/journal/scoreboard-leadership[/CAPTION]
[/SOCIAL_CAPTIONS]`;
}

function createMockRes() {
  const state = { statusCode: 200, body: null, headers: {} };
  return {
    statusCode: 200,
    setHeader(k, v) {
      state.headers[k] = v;
    },
    status(code) {
      state.statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(obj) {
      state.body = obj;
      this.body = obj;
      return this;
    },
    end(str) {
      try {
        state.body = JSON.parse(str);
      } catch {
        state.body = str;
      }
      this.body = state.body;
      return this;
    },
    getResult() {
      return { statusCode: state.statusCode, body: state.body, headers: state.headers };
    },
  };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');

  const sb = createClient(url, key);
  const { data: draft, error } = await sb
    .from('ao_content_drafts')
    .select('id, slug, title, content, status, image_url, series_slug, part_number, kind')
    .eq('id', DRAFT_ID)
    .single();
  if (error || !draft) throw new Error(`Draft fetch failed: ${error?.message || 'not found'}`);
  if (draft.slug !== 'scoreboard-leadership') {
    throw new Error(`Unexpected slug: ${draft.slug}`);
  }
  console.log('[one-off] draft status=', draft.status, 'image=', Boolean(draft.image_url));

  const times = futureCaptionTimes(new Date());
  console.log('[one-off] caption times (UTC):', times);
  const captions = buildSocialCaptionsBlock(times);
  const content = `${String(draft.content || '').trim()}\n\n${captions}`;

  const summary =
    'Wells Fargo\'s "Eight is Great" sales culture shows what happens when a number replaces a mission -- and why the two employees who used the company\'s own ethics hotline to report the fraud were the ones who got fired, years before Congress ever questioned the CEO who built it.';

  const cookie = buildOwnerCookie();
  const body = {
    slug: 'scoreboard-leadership',
    title: draft.title || 'Scoreboard Leadership',
    content,
    summary,
    publish_date: new Date().toISOString(),
    categories: ['Leadership', 'Servant Leadership'],
    image_url: draft.image_url,
    featured_image: draft.image_url,
    series_slug: draft.series_slug || 'power-vs-authority',
    part_number: draft.part_number || 2,
    notify: true,
    notify_delay_ms: 300000,
  };

  const handler = (await import('../api/ao/auto/publish-journal.js')).default;
  const req = {
    method: 'POST',
    headers: { cookie, Cookie: cookie },
    body,
  };
  const res = createMockRes();

  console.log('[one-off] invoking publish-journal handler…');
  await handler(req, res);
  const result = res.getResult();
  console.log('[one-off] status=', result.statusCode);
  console.log(JSON.stringify(result.body, null, 2));

  if (!result.body?.ok) {
    process.exitCode = 1;
    return;
  }

  // Confirm draft + scheduled posts
  const { data: after } = await sb
    .from('ao_content_drafts')
    .select('id, status, slug')
    .eq('id', DRAFT_ID)
    .single();
  console.log('[one-off] draft after:', after);

  const { data: posts, error: postsErr } = await sb
    .from('ao_scheduled_posts')
    .select('id, platform, scheduled_at, status, source_kind, intent')
    .eq('source_kind', 'journal_launch')
    .contains('intent', { journal_slug: 'scoreboard-leadership' })
    .order('scheduled_at', { ascending: true });
  if (postsErr) console.error('[one-off] scheduled query error:', postsErr.message);
  console.log('[one-off] scheduled posts:', JSON.stringify(posts, null, 2));
}

main().catch((err) => {
  console.error('[one-off] FATAL:', err);
  process.exit(1);
});
