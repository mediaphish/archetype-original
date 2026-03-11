/**
 * AO Automation — Seed external sources allowlist.
 * POST /api/ao/external-sources/seed
 *
 * Inserts a curated starter list into ao_external_sources.
 * Safe to run multiple times; it skips URLs that already exist.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

const SEED_SOURCES = [
  // Tier 1 — Global Leadership Research & Executive Thinking
  { tier: 1, name: 'HBR', url: 'https://hbr.org' },
  { tier: 1, name: 'HBR — Leadership', url: 'https://hbr.org/topic/leadership' },
  { tier: 1, name: 'McKinsey — Featured Insights', url: 'https://www.mckinsey.com/featured-insights' },
  { tier: 1, name: 'McKinsey — Leadership', url: 'https://www.mckinsey.com/featured-insights/leadership' },
  { tier: 1, name: 'MIT Sloan Management Review', url: 'https://sloanreview.mit.edu' },
  { tier: 1, name: 'strategy+business', url: 'https://www.strategy-business.com' },
  { tier: 1, name: 'BCG — Publications', url: 'https://www.bcg.com/publications' },
  { tier: 1, name: 'Strategyzer — Blog', url: 'https://www.strategyzer.com/blog' },

  // Tier 2 — Executive Insight Platforms
  { tier: 2, name: 'First Round Review', url: 'https://review.firstround.com' },
  { tier: 2, name: 'a16z — News & Content', url: 'https://a16z.com/news-content/' },
  { tier: 2, name: 'Y Combinator — Blog', url: 'https://www.ycombinator.com/blog' },
  { tier: 2, name: 'Both Sides of the Table', url: 'https://bothsidesofthetable.com' },
  { tier: 2, name: 'Tom Tunguz', url: 'https://tomtunguz.com' },
  { tier: 2, name: 'Fortune — CEO Daily', url: 'https://fortune.com/ceo-daily' },
  { tier: 2, name: 'Forbes — Leadership', url: 'https://www.forbes.com/leadership' },
  { tier: 2, name: 'Inc — Leadership', url: 'https://www.inc.com/leadership' },
  { tier: 2, name: 'Business Insider — Leadership', url: 'https://www.businessinsider.com/leadership' },

  // Tier 3 — Leadership Thinkers (Individual Blogs)
  { tier: 3, name: 'Lead Change Group', url: 'https://leadchangegroup.com' },
  { tier: 3, name: 'Lead From Within', url: 'https://leadfromwithin.com/blog' },
  { tier: 3, name: 'Leadership Freak', url: 'https://leadershipfreak.blog' },
  { tier: 3, name: 'Tanveer Naseer', url: 'https://tanveernaseer.com/blog' },
  { tier: 3, name: 'John Maxwell', url: 'https://johnmaxwell.com/blog' },
  { tier: 3, name: 'Lolly Daskal', url: 'https://lollydaskal.com/blog' },
  { tier: 3, name: 'Seth Godin', url: 'https://seths.blog' },
  { tier: 3, name: 'Simon Sinek — Optimism', url: 'https://simon-sinek.com/optimism' },

  // Tier 4 — Servant Leadership Sources
  { tier: 4, name: 'Greenleaf — Resources', url: 'https://greenleaf.org/resources' },
  { tier: 4, name: 'Greenleaf — Blog', url: 'https://www.greenleaf.org/blog' },
  { tier: 4, name: 'Servant Leadership Institute — Blog', url: 'https://servantleadershipinstitute.com/blog' },
  { tier: 4, name: 'Lead Like Jesus — Blog', url: 'https://leadlikejesus.com/blog' },
  { tier: 4, name: 'Maxwell Leadership — Blog', url: 'https://maxwellleadership.com/blog' },

  // Tier 5 — Leadership & Culture Research
  { tier: 5, name: 'Gallup — Workplace', url: 'https://www.gallup.com/workplace' },
  { tier: 5, name: 'Workhuman — Resources', url: 'https://workhuman.com/resources' },
  { tier: 5, name: 'CCL — Articles', url: 'https://www.ccl.org/articles' },
  { tier: 5, name: 'PMI — Learning Library', url: 'https://www.pmi.org/learning/library' },
  { tier: 5, name: 'APM — Blog', url: 'https://www.apm.org.uk/blog' },

  // Tier 6 — Business Publications with Leadership Commentary
  { tier: 6, name: 'The Economist — Business', url: 'https://www.economist.com/business' },
  { tier: 6, name: 'Financial Times — Leadership', url: 'https://www.ft.com/leadership' },
  { tier: 6, name: 'Bloomberg — Business', url: 'https://www.bloomberg.com/business' },
  { tier: 6, name: 'WSJ — Business', url: 'https://www.wsj.com/news/business' },
  { tier: 6, name: 'Fortune', url: 'https://fortune.com' },

  // Tier 7 — Leadership Podcasts
  { tier: 7, name: 'Farnam Street — Knowledge Project Podcast', url: 'https://fs.blog/knowledge-project-podcast' },
  { tier: 7, name: 'Tim Ferriss — Podcast', url: 'https://tim.blog/podcast' },
  { tier: 7, name: 'Jocko Podcast', url: 'https://www.jockopodcast.com' },
  { tier: 7, name: 'EntreLeadership — Podcast', url: 'https://entreleadership.com/podcast' },
  { tier: 7, name: 'WorkLife', url: 'https://www.worklife.ag' },

  // Tier 8 — Leadership YouTube Channels
  { tier: 8, name: 'YouTube — Simon Sinek', url: 'https://www.youtube.com/@SimonSinek' },
  { tier: 8, name: 'YouTube — Stanford GSB', url: 'https://www.youtube.com/@StanfordGraduateSchoolofBusiness' },
  { tier: 8, name: 'YouTube — TED', url: 'https://www.youtube.com/@TED' },
  { tier: 8, name: 'YouTube — London Business School', url: 'https://www.youtube.com/@LondonBusinessSchool' },
  { tier: 8, name: 'YouTube — Big Think', url: 'https://www.youtube.com/@BigThink' },

  // Tier 9 — Faith-Based Leadership
  { tier: 9, name: 'Desiring God — Leadership', url: 'https://www.desiringgod.org/topics/leadership' },
  { tier: 9, name: 'The Gospel Coalition — Leadership', url: 'https://www.thegospelcoalition.org/topics/leadership' },
  { tier: 9, name: 'Pastors.com — Leadership', url: 'https://www.pastors.com/category/leadership' },

  // Tier 10 — Leadership Aggregators
  { tier: 10, name: 'Feedly', url: 'https://feedly.com' },
  { tier: 10, name: 'Flipboard — Leadership', url: 'https://flipboard.com/topic/leadership' },
  { tier: 10, name: 'Reddit — r/leadership', url: 'https://www.reddit.com/r/leadership' },
  { tier: 10, name: 'Hacker News', url: 'https://news.ycombinator.com' },

  // Tier 11 — Social Leadership Sources
  { tier: 11, name: 'LinkedIn — Simon Sinek', url: 'https://www.linkedin.com/in/simonsinek' },
  { tier: 11, name: 'LinkedIn — Adam Grant', url: 'https://www.linkedin.com/in/adamhgrant' },
  { tier: 11, name: 'LinkedIn — Reid Hoffman', url: 'https://www.linkedin.com/in/reidhoffman' },
  { tier: 11, name: 'X — Naval', url: 'https://x.com/naval' },
  { tier: 11, name: 'X — Simon Sinek', url: 'https://x.com/simonsinek' },
  { tier: 11, name: 'X — Jocko Willink', url: 'https://x.com/jockowillink' },

  // Tier 12 — Academic Leadership Research
  { tier: 12, name: 'HBS — Faculty Research', url: 'https://hbs.edu/faculty/research' },
  { tier: 12, name: 'Stanford GSB — Insights', url: 'https://gsb.stanford.edu/insights' },
  { tier: 12, name: 'Knowledge@Wharton', url: 'https://knowledge.wharton.upenn.edu' },
  { tier: 12, name: 'MIT Sloan — Ideas Made to Matter', url: 'https://mitsloan.mit.edu/ideas-made-to-matter' },

  // Tier 13 — Leadership Newsletters
  { tier: 13, name: 'Farnam Street — Newsletter', url: 'https://fs.blog/newsletter' },
  { tier: 13, name: 'Stratechery', url: 'https://stratechery.com' },
  { tier: 13, name: 'Not Boring', url: 'https://notboring.co' },
  { tier: 13, name: 'Every', url: 'https://every.to' },
];

function normUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('ao_external_sources')
      .select('url')
      .limit(1000);

    if (existingErr) {
      if (String(existingErr.message || '').includes('ao_external_sources')) {
        return res.status(500).json({
          ok: false,
          error: 'External sources table is not set up yet. Run database/ao_queue_and_scan_schema.sql in Supabase.',
        });
      }
      return res.status(500).json({ ok: false, error: existingErr.message });
    }

    const existingSet = new Set((existing || []).map((r) => String(r.url || '').trim()).filter(Boolean));
    const toInsert = [];
    for (const s of SEED_SOURCES) {
      const url = normUrl(s.url);
      if (!url) continue;
      if (existingSet.has(url)) continue;
      toInsert.push({
        url,
        name: s.name ? `Tier ${s.tier} — ${String(s.name).trim()}`.slice(0, 120) : null,
        source_type: 'article',
        created_at: new Date().toISOString(),
      });
    }

    if (toInsert.length === 0) {
      return res.status(200).json({ ok: true, inserted: 0, skipped: SEED_SOURCES.length, message: 'Already seeded' });
    }

    const { error: insErr } = await supabaseAdmin
      .from('ao_external_sources')
      .insert(toInsert);

    if (insErr) {
      return res.status(500).json({ ok: false, error: insErr.message });
    }

    return res.status(200).json({
      ok: true,
      inserted: toInsert.length,
      skipped: SEED_SOURCES.length - toInsert.length,
    });
  } catch (e) {
    console.error('[ao/external-sources seed]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

