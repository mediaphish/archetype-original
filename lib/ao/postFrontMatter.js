/**
 * Reading and rewriting the summary in a published post's front matter.
 *
 * 2026-09-21: "The Org Chart Only Works Until It's Tested" was committed with a
 * summary that stopped mid-sentence ("About one in four professionals stall
 * when"). verify-post-summaries stopped the build, every deploy after it failed,
 * and the live URL served the app shell while Bart's social posts pointed at it.
 *
 * Pure string work, so the guard, the health check and the repair all read the
 * file the same way.
 */

/** The summary from YAML front matter, folded (>-) or inline. */
export function readFrontMatterSummary(markdown) {
  const fm = String(markdown || '').match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const block = fm[1];

  const folded = block.match(/^summary:\s*>-?\s*\n((?:[ \t]+.*\n?)+)/m);
  if (folded) {
    return folded[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');
  }

  const inline = block.match(/^summary:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m);
  if (inline) return (inline[1] ?? inline[2] ?? inline[3] ?? '').trim();
  return null;
}

/** The body below the front matter. */
export function readBody(markdown) {
  const text = String(markdown || '');
  const match = text.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1] : text;
}

/** Same file with a new summary, front matter otherwise untouched. */
export function replaceFrontMatterSummary(markdown, summary) {
  const text = String(markdown || '');
  const clean = String(summary || '').trim();
  if (!clean) return text;

  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return text;

  const folded = `summary: >-\n  ${clean.replace(/\n/g, '\n  ')}`;
  let block = fm[1];

  if (/^summary:\s*>-?\s*\n(?:[ \t]+.*\n?)+/m.test(block)) {
    block = block.replace(/^summary:\s*>-?\s*\n(?:[ \t]+.*\n?)+/m, `${folded}\n`);
  } else if (/^summary:.*$/m.test(block)) {
    block = block.replace(/^summary:.*$/m, folded);
  } else {
    block = `${block}\n${folded}`;
  }

  return text.replace(/^---\n[\s\S]*?\n---/, `---\n${block.replace(/\n+$/, '')}\n---`);
}
