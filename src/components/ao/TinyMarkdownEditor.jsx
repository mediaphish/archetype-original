import React, { useCallback, useMemo, useRef, useState } from 'react';

function clamp(s, max) {
  const t = String(s || '');
  return t.length > max ? t.slice(0, max) : t;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Minimal preview renderer (safe, no raw HTML). Supports:
// - headings (#, ##)
// - bold **x**
// - italic *x*
// - blockquote >
// - unordered list (- )
// - ordered list (1. )
// - links [text](url)
function renderMarkdownToHtml(md) {
  const lines = String(md || '').split('\n');
  const out = [];

  let inUl = false;
  let inOl = false;

  const flushLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inline = (text) => {
    let s = escapeHtml(text);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  };

  for (const raw of lines) {
    const line = raw || '';
    if (!line.trim()) {
      flushLists();
      continue;
    }

    if (line.startsWith('# ')) {
      flushLists();
      out.push(`<h1>${inline(line.slice(2).trim())}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushLists();
      out.push(`<h2>${inline(line.slice(3).trim())}</h2>`);
      continue;
    }
    if (line.startsWith('> ')) {
      flushLists();
      out.push(`<blockquote>${inline(line.slice(2).trim())}</blockquote>`);
      continue;
    }

    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ol) {
      if (!inOl) { flushLists(); out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(ol[2])}</li>`);
      continue;
    }

    const ul = line.match(/^\s*-\s+(.*)$/);
    if (ul) {
      if (!inUl) { flushLists(); out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    flushLists();
    out.push(`<p>${inline(line.trim())}</p>`);
  }

  flushLists();
  return out.join('\n');
}

function wrapSelection(text, start, end, left, right) {
  const before = text.slice(0, start);
  const sel = text.slice(start, end);
  const after = text.slice(end);
  return before + left + sel + right + after;
}

function prefixLines(text, start, end, prefix) {
  const before = text.slice(0, start);
  const sel = text.slice(start, end);
  const after = text.slice(end);
  const next = sel.split('\n').map((l) => (l.trim() ? `${prefix}${l}` : l)).join('\n');
  return before + next + after;
}

function parseSections(md) {
  const text = String(md || '');
  const lines = text.split('\n');
  const sections = [];
  let current = { key: '__whole__', title: 'Whole draft', lines: [], startLine: 0 };

  const pushCurrent = () => {
    const content = current.lines.join('\n');
    sections.push({ ...current, content });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^#{1,3}\s+/.test(line) && current.lines.length) {
      pushCurrent();
      const title = line.replace(/^#{1,3}\s+/, '').trim() || `Section ${sections.length + 1}`;
      current = { key: line.trim().toLowerCase(), title, lines: [line], startLine: i };
    } else {
      if (sections.length === 0 && current.key === '__whole__' && /^#{1,3}\s+/.test(line) && current.lines.length === 0) {
        current = { key: line.trim().toLowerCase(), title: line.replace(/^#{1,3}\s+/, '').trim(), lines: [line], startLine: i };
      } else {
        current.lines.push(line);
      }
    }
  }
  pushCurrent();
  return sections;
}

function rebuildSections(sections) {
  return (sections || []).map((s) => s.content).join('\n');
}

function enforceLockedSections(prevText, nextText, lockedMap) {
  const prevSections = parseSections(prevText);
  const nextSections = parseSections(nextText);
  const lockKeys = Object.keys(lockedMap || {});
  if (!lockKeys.length) return nextText;
  const patched = nextSections.map((section) => {
    const locked = lockedMap[section.key];
    if (!locked) return section;
    return { ...section, content: locked };
  });
  // Preserve locked sections even if a heading vanished in the edit.
  for (const prev of prevSections) {
    if (!lockedMap[prev.key]) continue;
    const exists = patched.some((x) => x.key === prev.key);
    if (!exists) patched.push({ ...prev, content: lockedMap[prev.key] });
  }
  return rebuildSections(patched);
}

export default function TinyMarkdownEditor({ value, onChange, onUploadMarkdown, placeholder, enableSectionLocks = false }) {
  const [mode, setMode] = useState('write'); // write | preview
  const textareaRef = useRef(null);
  const [lockedSections, setLockedSections] = useState({});

  const html = useMemo(() => renderMarkdownToHtml(value), [value]);

  const apply = useCallback((fn) => {
    const el = textareaRef.current;
    const t = String(value || '');
    if (!el) {
      onChange(fn(t, 0, 0));
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const next = fn(t, start, end);
    onChange(enableSectionLocks ? enforceLockedSections(t, next, lockedSections) : next);
    requestAnimationFrame(() => {
      try { el.focus(); } catch {}
    });
  }, [value, onChange, enableSectionLocks, lockedSections]);

  const cmdBold = () => apply((t, s, e) => wrapSelection(t, s, e, '**', '**'));
  const cmdItalic = () => apply((t, s, e) => wrapSelection(t, s, e, '*', '*'));
  const cmdH1 = () => apply((t, s, e) => prefixLines(t, s, e, '# '));
  const cmdH2 = () => apply((t, s, e) => prefixLines(t, s, e, '## '));
  const cmdBullets = () => apply((t, s, e) => prefixLines(t, s, e, '- '));
  const cmdNumbers = () => apply((t, s, e) => {
    const before = t.slice(0, s);
    const sel = t.slice(s, e);
    const after = t.slice(e);
    const lines = sel.split('\n');
    let n = 1;
    const next = lines.map((l) => (l.trim() ? `${n++}. ${l}` : l)).join('\n');
    return before + next + after;
  });
  const cmdQuote = () => apply((t, s, e) => prefixLines(t, s, e, '> '));
  const cmdLink = () => {
    const url = window.prompt('Link URL (https://...)');
    if (!url) return;
    apply((t, s, e) => wrapSelection(t, s, e, '[', `](${url})`));
  };

  const lockCurrentSection = useCallback(() => {
    const el = textareaRef.current;
    const text = String(value || '');
    const cursor = el?.selectionStart || 0;
    const sections = parseSections(text);
    let offset = 0;
    const current = sections.find((section) => {
      const start = offset;
      offset += section.content.length + 1;
      return cursor >= start && cursor <= offset;
    }) || sections[0];
    if (!current) return;
    setLockedSections((prev) => ({ ...prev, [current.key]: current.content }));
  }, [value]);

  const unlockSection = useCallback((key) => {
    setLockedSections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const onKeyDown = (e) => {
    if (!e.metaKey && !e.ctrlKey) return;
    const k = String(e.key || '').toLowerCase();
    if (k === 'b') { e.preventDefault(); cmdBold(); }
    if (k === 'i') { e.preventDefault(); cmdItalic(); }
  };

  return (
    <div className="border border-gray-300 rounded overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={cmdBold} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Bold">
            <strong>B</strong>
          </button>
          <button type="button" onClick={cmdItalic} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Italic">
            <em>I</em>
          </button>
          <button type="button" onClick={cmdH1} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Heading 1">
            H1
          </button>
          <button type="button" onClick={cmdH2} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Heading 2">
            H2
          </button>
          <button type="button" onClick={cmdBullets} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Bulleted list">
            • List
          </button>
          <button type="button" onClick={cmdNumbers} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Numbered list">
            1. List
          </button>
          <button type="button" onClick={cmdQuote} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Quote">
            “ Quote
          </button>
          <button type="button" onClick={cmdLink} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white" aria-label="Link">
            Link
          </button>
          {onUploadMarkdown ? (
            <button
              type="button"
              onClick={onUploadMarkdown}
              className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white"
            >
              Upload .md
            </button>
          ) : null}
          {enableSectionLocks ? (
            <button
              type="button"
              onClick={lockCurrentSection}
              className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-white"
            >
              Lock section
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`px-3 py-1 text-sm rounded ${mode === 'write' ? 'bg-gray-900 text-white' : 'border border-gray-300 hover:bg-white'}`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-sm rounded ${mode === 'preview' ? 'bg-gray-900 text-white' : 'border border-gray-300 hover:bg-white'}`}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <>
          {enableSectionLocks && Object.keys(lockedSections).length ? (
            <div className="px-3 pt-3 pb-0">
              <div className="flex flex-wrap gap-2">
                {Object.keys(lockedSections).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => unlockSection(key)}
                    className="px-2 py-1 text-xs rounded-full border border-amber-300 bg-amber-50 text-amber-900"
                  >
                    Locked: {key === '__whole__' ? 'Whole draft' : key.replace(/^#+\s*/, '')} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={clamp(value, 40000)}
            onChange={(e) => {
              const next = e.target.value;
              onChange(enableSectionLocks ? enforceLockedSections(value, next, lockedSections) : next);
            }}
            onKeyDown={onKeyDown}
            rows={10}
            placeholder={placeholder || 'Write your post…'}
            className="w-full p-3 text-sm outline-none resize-y"
          />
        </>
      ) : (
        <div className="p-4 prose prose-sm max-w-none">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: html || '<p class=\"text-gray-500\">Nothing to preview yet.</p>' }} />
        </div>
      )}
    </div>
  );
}

