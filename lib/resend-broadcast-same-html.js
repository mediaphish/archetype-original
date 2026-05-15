/**
 * Send the same HTML + subject to many recipients using Resend's
 * single-mail endpoint (`emails.send` with string `to`).
 *
 * Other routes (subscribe confirmation, contact) already use this shape
 * successfully. The batch endpoint has been unreliable in production
 * (422 validation on `to` despite array formatting).
 *
 * @param {object} opts
 * @param {import('resend').Resend} opts.resend
 * @param {string} opts.from
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {Array<{ id?: string|number, email: string }>} opts.recipients
 * @param {number} [opts.concurrency=5]
 * @param {number} [opts.interWaveDelayMs=200]
 * @returns {Promise<{ sent: number, failed: number, failures: Array<{ recipient: object, error: object }>, sentAddresses: string[] }>}
 */
export async function resendBroadcastSameHtml({
  resend,
  from,
  subject,
  html,
  recipients,
  concurrency = 5,
  interWaveDelayMs = 200,
}) {
  let sent = 0;
  let failed = 0;
  const failures = [];
  const sentAddresses = [];

  const valid = recipients.filter((r) => {
    const e = String(r?.email || "").trim();
    return e.includes("@");
  });

  async function sendOne(recipient) {
    const to = String(recipient.email || "").trim();
    let attempts = 3;
    while (attempts > 0) {
      try {
        const result = await resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        if (!result?.error) {
          sent++;
          sentAddresses.push(to);
          return;
        }

        if (result.error.statusCode === 429) {
          attempts--;
          if (attempts > 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
        }

        failed++;
        failures.push({ recipient, error: result.error });
        return;
      } catch (err) {
        // Thrown errors (network, etc.) must not bubble: callers may treat "no return" as zero
        // sends and release devotional dedupe locks, causing duplicate mass emails.
        attempts--;
        if (attempts > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        failed++;
        failures.push({
          recipient,
          error: {
            name: err?.name || "Error",
            message: err?.message || String(err),
          },
        });
        return;
      }
    }
  }

  for (let i = 0; i < valid.length; i += concurrency) {
    const wave = valid.slice(i, i + concurrency);
    await Promise.all(wave.map(sendOne));
    if (i + concurrency < valid.length) {
      await new Promise((r) => setTimeout(r, interWaveDelayMs));
    }
  }

  return { sent, failed, failures, sentAddresses };
}

/**
 * Same as {@link resendBroadcastSameHtml} but HTML is built per recipient
 * (e.g. event announcements with personalized links).
 *
 * @param {object} opts
 * @param {import('resend').Resend} opts.resend
 * @param {string} opts.from
 * @param {string} opts.subject
 * @param {Array<{ email: string }>} opts.recipients
 * @param {(recipient: { email: string }) => string} opts.getHtml
 * @param {number} [opts.concurrency=5]
 * @param {number} [opts.interWaveDelayMs=200]
 */
export async function resendBroadcastDynamicHtml({
  resend,
  from,
  subject,
  recipients,
  getHtml,
  concurrency = 5,
  interWaveDelayMs = 200,
}) {
  let sent = 0;
  let failed = 0;
  const failures = [];

  const valid = recipients.filter((r) => {
    const e = String(r?.email || "").trim();
    return e.includes("@");
  });

  async function sendOne(recipient) {
    const to = String(recipient.email || "").trim();
    const html = getHtml(recipient);
    let attempts = 3;
    while (attempts > 0) {
      try {
        const result = await resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        if (!result?.error) {
          sent++;
          return;
        }

        if (result.error.statusCode === 429) {
          attempts--;
          if (attempts > 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
        }

        failed++;
        failures.push({ recipient, error: result.error });
        return;
      } catch (err) {
        attempts--;
        if (attempts > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        failed++;
        failures.push({
          recipient,
          error: {
            name: err?.name || "Error",
            message: err?.message || String(err),
          },
        });
        return;
      }
    }
  }

  for (let i = 0; i < valid.length; i += concurrency) {
    const wave = valid.slice(i, i + concurrency);
    await Promise.all(wave.map(sendOne));
    if (i + concurrency < valid.length) {
      await new Promise((r) => setTimeout(r, interWaveDelayMs));
    }
  }

  return { sent, failed, failures };
}
