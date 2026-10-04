/**
 * @jest-environment node
 *
 * The 175 people who could have been emailed twice (2026-10-04).
 *
 * The broadcast sends one message per recipient, five at a time, and used to
 * hand every delivered address back to the caller only once the whole list had
 * been attempted. Recording happened after that. So a crash or a function
 * timeout partway through 175 recipients left no record that anyone had been
 * delivered to, and the retry, correctly seeing an empty ledger, sent to all of
 * them again.
 *
 * Today's send took 45 seconds and finished. At a longer list it would not, and
 * the first anyone would know is a duplicate devotional in 175 inboxes.
 *
 * Each wave is now recorded as it lands.
 */
import { resendBroadcastSameHtml } from '../resend-broadcast-same-html.js';

function recipients(n) {
  return Array.from({ length: n }, (_, i) => ({ email: `person${i}@example.com` }));
}

/**
 * A Resend stand-in that stops delivering partway through, the way a function
 * timeout or an outage does. It reports a plain server error rather than
 * throwing, so the sender's retry backoff does not make the test slow.
 */
function fakeResend({ dieAfter = Infinity } = {}) {
  let count = 0;
  return {
    calls: () => count,
    emails: {
      send: async () => {
        count += 1;
        if (count > dieAfter) return { error: { statusCode: 500, message: 'gone' } };
        return { error: null };
      },
    },
  };
}

describe('a devotional send records recipients as it goes', () => {
  test('every address is reported before the send finishes, not after', async () => {
    const seen = [];
    const resend = fakeResend();
    await resendBroadcastSameHtml({
      resend,
      from: 'a@b.com',
      subject: 's',
      html: '<p>x</p>',
      recipients: recipients(12),
      concurrency: 5,
      interWaveDelayMs: 0,
      onWaveSent: (addresses) => seen.push([...addresses]),
    });

    // Three waves of 5, 5 and 2, each handed back separately.
    expect(seen.length).toBe(3);
    expect(seen.flat().length).toBe(12);
    expect(new Set(seen.flat()).size).toBe(12);
  });

  test('a send that dies partway still recorded everyone already delivered to', async () => {
    const recorded = [];
    // Stops delivering during the third wave, after 11 have gone out.
    const resend = fakeResend({ dieAfter: 11 });
    const result = await resendBroadcastSameHtml({
      resend,
      from: 'a@b.com',
      subject: 's',
      html: '<p>x</p>',
      recipients: recipients(20),
      concurrency: 5,
      interWaveDelayMs: 0,
      onWaveSent: (addresses) => recorded.push(...addresses),
    });

    // The ones that got through are on record, so a retry skips them.
    expect(recorded.length).toBe(result.sent);
    expect(result.sent).toBe(11);
    expect(result.failed).toBe(9);
    expect(new Set(recorded).size).toBe(recorded.length);
  });

  test('a failure to record does not stop the rest of the list being sent', async () => {
    const resend = fakeResend();
    const result = await resendBroadcastSameHtml({
      resend,
      from: 'a@b.com',
      subject: 's',
      html: '<p>x</p>',
      recipients: recipients(15),
      concurrency: 5,
      interWaveDelayMs: 0,
      onWaveSent: () => {
        throw new Error('database unreachable');
      },
    });
    expect(result.sent).toBe(15);
  });

  test('it still works with no recorder, which is how journal posts send', async () => {
    const resend = fakeResend();
    const result = await resendBroadcastSameHtml({
      resend,
      from: 'a@b.com',
      subject: 's',
      html: '<p>x</p>',
      recipients: recipients(7),
      concurrency: 5,
      interWaveDelayMs: 0,
    });
    expect(result.sent).toBe(7);
  });
});

describe('both senders are wired to it', () => {
  test('the cron and the notify endpoint each pass a recorder', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const file of ['api/cron/daily-devotional-notify.js', 'api/journal/notify.js']) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source).toContain('onWaveSent');
      expect(source).toContain('recordDevotionalRecipientsSent');
    }
  });
});
