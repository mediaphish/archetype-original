/**
 * Bart, 2026-10-27: "I need the ability to zoom an image on mobile in the
 * artifact panel."
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageZoom, { clampScale, isZoomableImage, MAX_SCALE } from '../ImageZoom.jsx';

test('zoom stays between actual size and the limit', () => {
  expect(clampScale(0.2)).toBe(1);
  expect(clampScale(3)).toBe(3);
  expect(clampScale(99)).toBe(MAX_SCALE);
  expect(clampScale(NaN)).toBe(1);
});

test('post images open the viewer; team pictures and hidden icons do not', () => {
  const img = (src, attrs = {}) => {
    const el = document.createElement('img');
    el.setAttribute('src', src);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  expect(isZoomableImage(img('https://x.supabase.co/journal-header.png'))).toBe(true);
  expect(isZoomableImage(img('/images/team/red.png'))).toBe(false);
  expect(isZoomableImage(img('/x.png', { 'aria-hidden': 'true' }))).toBe(false);
  expect(isZoomableImage(document.createElement('div'))).toBe(false);
});

test('the viewer shows the image full screen and closes', () => {
  const onClose = jest.fn();
  render(<ImageZoom src="https://x.supabase.co/journal-header.png" alt="The Josiah header" onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Image viewer' })).toBeTruthy();
  expect(screen.getByAltText('The Josiah header')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close image viewer' }));
  expect(onClose).toHaveBeenCalled();
});
