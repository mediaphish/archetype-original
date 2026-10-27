import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen image viewer for the Artifact panel. Pinch to zoom, drag to
 * move around, double-tap to zoom in or back out, tap × to close.
 *
 * Bart, 2026-10-27: "I need the ability to zoom an image on mobile in the
 * artifact panel."
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SCALE = 2.5;

/** Pure: keep a zoom level inside the limits. */
export function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
}

/** Pure: which images in the panel open the viewer (not avatars or icons). */
export function isZoomableImage(el) {
  if (!el || el.tagName !== 'IMG') return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.closest && el.closest('[data-no-zoom="1"]')) return false;
  const src = el.getAttribute('src') || '';
  return Boolean(src) && !/\/images\/team\//.test(src);
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export default function ImageZoom({ src, alt = '', onClose }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const startGesture = useCallback(() => {
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      gesture.current = { kind: 'pinch', startDist: distance(pts[0], pts[1]) || 1, startView: view };
    } else if (pts.length === 1) {
      gesture.current = { kind: 'pan', start: pts[0], startView: view };
    } else {
      gesture.current = null;
    }
  }, [view]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        setView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: DOUBLE_TAP_SCALE, x: 0, y: 0 }));
        gesture.current = null;
        return;
      }
      lastTap.current = now;
    }
    startGesture();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (g.kind === 'pinch' && pts.length >= 2) {
      const scale = clampScale((g.startView.scale * distance(pts[0], pts[1])) / g.startDist);
      setView({ ...g.startView, scale, ...(scale === 1 ? { x: 0, y: 0 } : {}) });
    } else if (g.kind === 'pan' && pts.length === 1 && g.startView.scale > 1) {
      setView({ ...g.startView, x: g.startView.x + (pts[0].x - g.start.x), y: g.startView.y + (pts[0].y - g.start.y) });
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    startGesture();
  };

  const onWheel = (e) => {
    const scale = clampScale(view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    setView((v) => ({ ...v, scale, ...(scale === 1 ? { x: 0, y: 0 } : {}) }));
  };

  // Rendered on the page itself, so a sliding phone panel cannot shrink or clip it.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Image viewer" data-no-zoom="1">
      <div className="flex items-center justify-between px-3 py-2 text-white">
        <span className="text-xs text-gray-300">Pinch or double-tap to zoom</span>
        <div className="flex items-center gap-3">
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-300 underline">
            Full size
          </a>
          <button type="button" onClick={onClose} className="h-10 w-10 text-2xl leading-none" aria-label="Close image viewer">
            ×
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'center center' }}
        />
      </div>
    </div>,
    document.body
  );
}
