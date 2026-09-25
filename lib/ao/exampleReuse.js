/**
 * Has Bart already used this real-world example?
 *
 * 2026-09-19. Asked for real leaders to illustrate a post, Auto recommended
 * Alan Mulally's Ford Edge meeting and John Stumpf at Wells Fargo, having run
 * only a web search. Both were already in Bart's published writing, the Ford
 * story verbatim. Bart: "You only exist because of the corpus. If you refuse to
 * check it, you are literally of little value to me." And on how to check: "A
 * name in a specific context would be more accurate... Make Auto do hard things
 * quickly."
 *
 * So every reply that brings in real-world examples is checked, after it is
 * written and before it is saved:
 *   1. A model call pulls out each example as a subject plus the specific story
 *      or situation used (not just the name), skipping anything Bart raised himself.
 *   2. The corpus is searched two ways per example: the exact name, and the
 *      meaning of "subject: story".
 *   3. A model call judges each example against those passages: the same story
 *      Bart already told, the same subject in a different story, or not used.
 * Findings are appended under the reply. It informs; it never rewrites or
 * removes anything Auto said.
 *
 * Measured the same day with exact-name search: "Mulally" and "Ford Edge" hit
 * only unity-is-not-sameness, "Stumpf" only scoreboard-leadership; Boeing,
 * Satya Nadella, Howard Schultz and Tylenol hit nothing.
 */
import Anthropic from '@anthropic-ai/sdk';
import { extractJson } from './archyModel.js';

const MODEL = () => process.env.AUTO_EXAMPLE_CHECK_MODEL || 'claude-opus-5';
const MAX_EXAMPLES = 6;
const MIN_REPLY_CHARS = 200;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function textOf(response) {
  return (response?.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

async function askJson({ system, prompt, maxTokens = 4000 }) {
  const c = getClient();
  if (!c) return null;
  const response = await c.messages.create({
    model: MODEL(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'low' },
  });
  if (response.stop_reason === 'refusal') return null;
  return extractJson(textOf(response));
}

export function buildExtractionPrompt(reply, bartText) {
  return (
    'Below is a reply from an assistant that helps a leadership writer, and the writer\'s own recent messages.\n\n' +
    'List every real-world example the ASSISTANT brings in: a named person, company, organization, event, case or ' +
    'named study used to illustrate a point or recommended for a post. For each, give the subject and the specific ' +
    'story or situation it is used for, in one sentence. Skip anything the writer raised himself in his messages, ' +
    'skip the writer himself, and skip passing mentions that are not used as an example.\n\n' +
    'One subject per example. Never combine two people or two organizations into a single subject, even when the ' +
    'reply mentions them together: "Uzziah and Achan" is two examples, not one. The only exception is a name that ' +
    'is genuinely one entity, such as a firm called Procter and Gamble.\n\n' +
    `Return JSON: {"examples":[{"subject":"...","story":"...","search_terms":["exact name", "other exact name or term"]}]}. ` +
    `At most ${MAX_EXAMPLES}. If there are none, return {"examples":[]}.\n\n` +
    `<writer_messages>\n${String(bartText || '').slice(-6000)}\n</writer_messages>\n\n` +
    `<assistant_reply>\n${String(reply || '').slice(0, 12000)}\n</assistant_reply>`
  );
}

/** Validated examples from the extraction call. */
export function parseExamples(json) {
  const list = Array.isArray(json?.examples) ? json.examples : [];
  return list
    .map((e) => ({
      subject: String(e?.subject || '').trim(),
      story: String(e?.story || '').trim(),
      search_terms: (Array.isArray(e?.search_terms) ? e.search_terms : [])
        .map((t) => String(t || '').trim())
        .filter((t) => t.length >= 3)
        .slice(0, 3),
    }))
    .filter((e) => e.subject)
    .slice(0, MAX_EXAMPLES);
}

/** One entry per passage, keyed by slug and passage start, capped per example. */
export function mergeCandidates(lists, cap = 8) {
  const seen = new Set();
  const out = [];
  for (const c of lists.flat()) {
    if (!c?.slug || !c?.content) continue;
    const key = `${c.slug}:${String(c.content).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ slug: c.slug, title: c.title || c.slug, doc_type: c.doc_type || null, content: String(c.content).slice(0, 700) });
    if (out.length >= cap) break;
  }
  return out;
}

export async function findCandidates(example) {
  const { supabaseAdmin } = await import('../supabase-admin.js');
  const { searchCorpusChunks } = await import('./corpusChunks.js');

  const exact = await Promise.all(
    example.search_terms.map(async (term) => {
      const { data } = await supabaseAdmin
        .from('ao_corpus_chunks')
        .select('slug, title, doc_type, content')
        .ilike('content', `%${term.replace(/[%_]/g, '')}%`)
        .limit(4);
      return data || [];
    })
  );
  const semantic = await searchCorpusChunks(`${example.subject}: ${example.story}`, {
    threshold: 0.45,
    maxResults: 4,
  }).catch(() => []);

  return mergeCandidates([...exact, semantic]);
}

export function buildJudgePrompt(items) {
  const blocks = items
    .map((it, i) => {
      const passages = it.candidates
        .map((c) => `  [${c.slug}] "${c.title}"\n  ${c.content.replace(/\s+/g, ' ')}`)
        .join('\n\n');
      return `EXAMPLE ${i + 1}: ${it.example.subject}\nUsed for: ${it.example.story}\nPassages from the writer's published work:\n${passages || '  (none found)'}`;
    })
    .join('\n\n---\n\n');
  return (
    'For each example, decide whether the writer has already used it, based only on the passages shown.\n' +
    '- "same_story": the passages tell the same story or situation about this subject.\n' +
    '- "same_subject": the subject appears, but for a different story or point.\n' +
    '- "not_used": the subject does not appear in the passages.\n' +
    'Cite only a slug shown in that example\'s passages. "note" says in a few words what the writer already used it for.\n\n' +
    'Return JSON: {"findings":[{"example":1,"verdict":"same_story|same_subject|not_used","slug":"...","note":"..."}]}\n\n' +
    blocks
  );
}

const SUBJECT_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'at', 'in', 'on', 'and', 'for', 'his', 'her', 'its', 'their',
]);

/**
 * The pieces of a subject that have to be found separately.
 *
 * A compound subject is the failure this guards: when "Uzziah and Achan"
 * arrives as one subject, a passage mentioning only Achan must not be reported
 * against Uzziah. Splitting a real name like "Procter and Gamble" costs
 * nothing, because a passage that genuinely mentions the firm contains both
 * halves and every part is found.
 */
export function subjectParts(subject) {
  return String(subject || '')
    .split(/\s+(?:and|&)\s+|\s*,\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The words in a part that are distinctive enough to search for. */
function nameTokens(part) {
  return String(part || '')
    .split(/[^\p{L}\p{N}']+/u)
    .map((word) => word.replace(/'s$/i, '').trim())
    .filter((word) => word.length >= 3 && !SUBJECT_STOPWORDS.has(word.toLowerCase()));
}

/**
 * The subject actually present in the passage, or null when none of it is.
 *
 * 2026-09-25. Auto told Bart that "Uzziah and Achan" already appeared in
 * "Achan's Confession". Uzziah appears nowhere in the corpus. The extraction
 * call had merged two names into one subject and the judge matched the half it
 * could find. A finding Bart cannot trust without rechecking it himself is
 * worth less than no finding, so the text is verified against the passage here:
 * every part of the subject has to be in it, and the parts that are not drop
 * out. A finding about a real match survives, narrowed to the name it is true
 * about.
 */
export function verifySubjectInPassage(subject, passageText) {
  const haystack = String(passageText || '').toLowerCase();
  if (!haystack) return null;

  const parts = subjectParts(subject);
  const found = parts.filter((part) => {
    const tokens = nameTokens(part);
    if (!tokens.length) return false;
    return tokens.some((token) =>
      new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(haystack)
    );
  });

  if (!found.length) return null;
  // Nothing was dropped, so the subject is reported exactly as it was written.
  if (found.length === parts.length) return String(subject).trim();
  return found.join(' and ');
}

/**
 * Keep only findings whose cited slug was shown for that example, and whose
 * subject is really in the passage that was cited.
 */
export function parseFindings(json, items) {
  const list = Array.isArray(json?.findings) ? json.findings : [];
  const out = [];
  for (const f of list) {
    const item = items[Number(f?.example) - 1];
    const verdict = String(f?.verdict || '');
    if (!item || !['same_story', 'same_subject'].includes(verdict)) continue;
    const cand = item.candidates.find((c) => c.slug === String(f?.slug || ''));
    if (!cand) continue;
    const subject = verifySubjectInPassage(
      item.example.subject,
      `${cand.title || ''} ${cand.content || ''}`
    );
    if (!subject) continue;
    out.push({
      subject,
      verdict,
      slug: cand.slug,
      title: cand.title,
      url: cand.doc_type === 'journal-post' ? `/journal/${cand.slug}` : null,
      note: String(f?.note || '').trim() || null,
    });
  }
  return out;
}

/** The note shown under the reply, or null when nothing was already used. */
export function formatExampleReuseNote(findings, { corpusCheckedThisTurn = true } = {}) {
  if (!Array.isArray(findings) || !findings.length) return null;
  const lines = findings.map((f) => {
    const where = f.url ? `"${f.title}" (${f.url})` : `"${f.title}"`;
    const what =
      f.verdict === 'same_story'
        ? `the same story is already in ${where}`
        : `already appears in ${where} in a different context`;
    return `- ${f.subject}: ${what}${f.note ? `. ${f.note}` : ''}`;
  });
  return (
    '---\n**Corpus check on the examples above:**\n' +
    `${lines.join('\n')}` +
    (corpusCheckedThisTurn ? '' : '\n\nThese were recommended without searching the corpus first.')
  );
}

/**
 * Run the whole check. Returns findings; [] when there is nothing to check or
 * anything fails. Never throws, so a failure can never cost Bart the reply.
 */
export async function checkExampleReuse({ reply, bartText = '' }) {
  try {
    if (String(reply || '').length < MIN_REPLY_CHARS) return [];
    const examples = parseExamples(
      await askJson({
        system: 'You extract structured data. Reply with only the JSON object requested, no prose, no code fences.',
        prompt: buildExtractionPrompt(reply, bartText),
      })
    );
    if (!examples.length) return [];

    const items = await Promise.all(
      examples.map(async (example) => ({ example, candidates: await findCandidates(example) }))
    );
    const withCandidates = items.filter((it) => it.candidates.length);
    if (!withCandidates.length) return [];

    return parseFindings(
      await askJson({
        system: 'You compare examples against published passages. Reply with only the JSON object requested.',
        prompt: buildJudgePrompt(withCandidates),
      }),
      withCandidates
    );
  } catch (err) {
    console.warn('[exampleReuse] check failed (no note added):', err?.message || err);
    return [];
  }
}
