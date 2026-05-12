/**
 * Quote card PNG (1080×1080) + upload to Supabase ao-auto-attachments.
 * Used by /api/ao/auto/generate-card-image and by chat after caption approval
 * (no HTTP loopback).
 */

import { createCanvas } from '@napi-rs/canvas';
import { supabaseAdmin } from '../supabase-admin.js';

const WIDTH = 1080;
const HEIGHT = 1080;
const BG_COLOR = '#0a0a0a';
const TEXT_COLOR = '#ffffff';
const MARK_COLOR = 'rgba(255,255,255,0.35)';
const FONT_WEIGHT = 'bold';
const FONT_SIZE = 64;
const LINE_HEIGHT = 88;
const MAX_TEXT_WIDTH = 860;
const STORAGE_BUCKET = 'ao-auto-attachments';
const STORAGE_PREFIX = 'auto-hub-quote-cards';

function drawAOMark(ctx, cx, cy, size) {
  ctx.save();
  ctx.strokeStyle = MARK_COLOR;
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const { width } = ctx.measureText(test);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function generateCardBuffer(line1, line2) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px -apple-system, "Helvetica Neue", Arial, sans-serif`;

  const lines1 = wrapText(ctx, line1, MAX_TEXT_WIDTH);
  const lines2 = wrapText(ctx, line2, MAX_TEXT_WIDTH);
  const allLines = [...lines1, ...lines2];
  const textBlockHeight = allLines.length * LINE_HEIGHT;
  const textAreaCenter = HEIGHT * 0.42;
  const startY = textAreaCenter - textBlockHeight / 2 + LINE_HEIGHT / 2;

  lines1.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * LINE_HEIGHT);
  });

  const line2StartY = startY + lines1.length * LINE_HEIGHT + LINE_HEIGHT * 0.4;
  lines2.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, line2StartY + i * LINE_HEIGHT);
  });

  drawAOMark(ctx, WIDTH / 2, HEIGHT - 120, 36);

  return canvas.toBuffer('image/png');
}

/**
 * @param {{ line1: string, line2: string, card_index?: number, batch_id?: string }} opts
 * @returns {Promise<{ ok: boolean, image_url?: string, path?: string, filename?: string, error?: string }>}
 */
export async function generateQuoteCardImage({ line1, line2, card_index, batch_id }) {
  if (!String(line1 || '').trim() || !String(line2 || '').trim()) {
    return {
      ok: false,
      error:
        'line1 and line2 are required. Each should be a full card line including the label (e.g. "Power says: Demand compliance").',
    };
  }

  try {
    const buffer = generateCardBuffer(line1.trim(), line2.trim());
    const timestamp = Date.now();
    const idx = card_index ? `-${card_index}` : '';
    const batch = batch_id ? `-${batch_id}` : '';
    const filename = `card${idx}${batch}-${timestamp}.png`;
    const storagePath = `${STORAGE_PREFIX}/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[generateQuoteCardImage] Upload error:', uploadError.message);
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) {
      return { ok: false, error: 'Image uploaded but could not retrieve public URL.' };
    }

    return { ok: true, image_url: imageUrl, path: storagePath, filename };
  } catch (err) {
    console.error('[generateQuoteCardImage]', err?.message || err);
    return { ok: false, error: err?.message || 'Image generation failed' };
  }
}
