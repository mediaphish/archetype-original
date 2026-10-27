import React from 'react';

/**
 * Shows the team's replies the way they were written: bold, italics, headings,
 * lists and links, instead of the raw ** and ### marks. Built from plain React
 * elements (no injected HTML), so nothing in a reply can run on the page, and
 * the text stays selectable for highlight-and-reply.
 */

function inline(text, keyBase) {
  const out = [];
  // Order matters: pictures, links, then bold, then italics, then inline code.
  // A picture the team shows (2026-10-27: Des's quote cards came through as
  // "!Before the Sun Sets card" links) is drawn as the image itself, https only.
  const re = /(!\[([^\]]*)\]\((https:\/\/[^\s)]+)\))|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*)|(`([^`]+)`)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) {
      out.push(
        <img key={k} src={m[3]} alt={m[2] || ''} loading="lazy" className="my-2 block max-h-[420px] w-auto max-w-full cursor-zoom-in rounded-lg border border-gray-200" />
      );
    } else if (m[4]) {
      out.push(
        <a key={k} href={m[6]} target={m[6].startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="underline">
          {m[5]}
        </a>
      );
    } else if (m[7]) {
      out.push(
        <strong key={k}>
          <em>{m[8]}</em>
        </strong>
      );
    } else if (m[9]) {
      out.push(<strong key={k}>{m[10]}</strong>);
    } else if (m[11]) {
      out.push(<em key={k}>{m[12]}</em>);
    } else if (m[13]) {
      out.push(
        <code key={k} className="px-1 rounded bg-gray-100 text-[0.92em]">
          {m[14]}
        </code>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function ChatMarkdown({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = null;
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l-${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 my-1 space-y-0.5`}>
        {list.items.map((it, j) => (
          <li key={j}>{inline(it, `li-${blocks.length}-${j}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, '');
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered && !bullet;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      return;
    }
    flushList();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={`h-${idx}`} className={`font-semibold text-gray-900 ${heading[1].length <= 2 ? 'text-[15px] mt-2' : 'mt-1'}`}>
          {inline(heading[2], `h-${idx}`)}
        </p>
      );
      return;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={`r-${idx}`} className="my-2 border-gray-200" />);
      return;
    }
    if (/^\s*>\s?/.test(line)) {
      blocks.push(
        <p key={`q-${idx}`} className="border-l-2 border-gray-300 pl-3 text-gray-700 italic">
          {inline(line.replace(/^\s*>\s?/, ''), `q-${idx}`)}
        </p>
      );
      return;
    }
    if (!line.trim()) {
      blocks.push(<div key={`s-${idx}`} className="h-2" />);
      return;
    }
    blocks.push(<p key={`p-${idx}`}>{inline(line, `p-${idx}`)}</p>);
  });
  flushList();
  return <>{blocks}</>;
}
