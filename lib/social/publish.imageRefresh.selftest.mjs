/**
 * Regression: journal-launch image_url refresh before publish (prompt 12).
 * Run: node lib/social/publish.imageRefresh.selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const { publishOne, resolveImageUrlForPublish } = await import('./publish.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), msg || `${actual} !== ${expected}`);
}

{
  let updatedPayload = null;
  const url = await resolveImageUrlForPublish(
    {
      id: 'row-1',
      image_url: null,
      intent: { journal_slug: 'the-ruth-archetype' },
    },
    {
      lookupDraftImageUrl: async () => 'https://cdn.example.com/ruth-header.png',
      updateScheduledPost: async (_id, payload) => {
        updatedPayload = payload;
        return { error: null };
      },
    }
  );
  assertEqual(url, 'https://cdn.example.com/ruth-header.png');
  assertEqual(updatedPayload, { image_url: 'https://cdn.example.com/ruth-header.png' });
}

{
  const url = await resolveImageUrlForPublish(
    {
      id: 'row-2',
      image_url: null,
      intent: null,
    },
    {
      lookupDraftImageUrl: async () => {
        throw new Error('should not be called');
      },
    }
  );
  assertEqual(url, null, 'non-journal row stays null without lookup');
}

{
  let receivedImageUrl;
  const result = await publishOne(
    {
      id: 'row-3',
      platform: 'instagram',
      account_id: 'meta',
      text: 'Real caption for Ruth post.',
      caption: 'Real caption for Ruth post.',
      image_url: null,
      intent: { journal_slug: 'the-ruth-archetype' },
    },
    {
      adapters: {
        instagram: async ({ imageUrl }) => {
          receivedImageUrl = imageUrl;
          return { success: true, postId: 'ig-123' };
        },
      },
      deps: {
        lookupDraftImageUrl: async () => 'https://cdn.example.com/ruth-header.png',
        updateScheduledPost: async () => ({ error: null }),
      },
    }
  );
  assert(result.ok, 'publishOne succeeds with refreshed image');
  assertEqual(receivedImageUrl, 'https://cdn.example.com/ruth-header.png');
}

console.log('publish.imageRefresh.selftest: all checks passed');
