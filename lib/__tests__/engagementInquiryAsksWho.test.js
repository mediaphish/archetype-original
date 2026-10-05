/**
 * @jest-environment node
 *
 * The inquiry nobody could answer (2026-10-04).
 *
 * Bart received a serious engagement inquiry from someone referring to a
 * conversation they had had in the spring. It carried no name, no email and no
 * phone number. Not a delivery fault: the form had never asked. There was no
 * name field, no email field and no phone field on the page or in the handler,
 * and the handler wrote to no database at all, so the notification email was the
 * only copy of that person that had ever existed.
 *
 * Every engagement inquiry before this one was anonymous unless the sender
 * happened to name themselves inside an answer. The general contact form, the
 * lower-intent one, had asked for and validated a name and email all along.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = readFileSync(join(root, 'src/pages/EngagementInquiry.jsx'), 'utf8');
const handler = readFileSync(join(root, 'api/engagement-inquiry.js'), 'utf8');

describe('the form asks who is filling it in', () => {
  test('the page has a name, an email and a phone field', () => {
    expect(page).toContain('id="ei-name"');
    expect(page).toContain('id="ei-email"');
    expect(page).toContain('id="ei-phone"');
    expect(page).toContain('type="email"');
  });

  test('name and email are carried in the submitted data', () => {
    expect(page).toMatch(/name: '',/);
    expect(page).toMatch(/email: '',/);
  });

  test('the page refuses to submit without a reply address', () => {
    expect(page).toContain('emailLooksReal');
    expect(page).toMatch(/so Bart can reply to you/);
  });
});

describe('the server will not accept an unanswerable inquiry', () => {
  test('it reads the sender off the request', () => {
    expect(handler).toMatch(/senderName/);
    expect(handler).toMatch(/senderEmail/);
  });

  test('it rejects a missing name or a bad email', () => {
    expect(handler).toMatch(/if \(!senderName \|\| !\/\^\[\^\\s@\]\+@/);
    expect(handler).toContain('status(400)');
  });

  test('the notification can be replied to directly', () => {
    expect(handler).toContain('reply_to: senderEmail');
  });
});

describe('an inquiry survives a failed notification', () => {
  test('it is written to the database before the email is sent', () => {
    const storeAt = handler.indexOf("from(\"engagement_inquiries\")");
    const sendAt = handler.indexOf('resend.emails.send');
    expect(storeAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(-1);
    expect(storeAt).toBeLessThan(sendAt);
  });

  test('a database failure does not refuse the inquiry', () => {
    // Losing the record is bad. Turning away someone trying to hire him is worse.
    expect(handler).toMatch(/could not store the inquiry/);
  });

  test('a failed email is not reported to the sender as a failure when it was saved', () => {
    expect(handler).toContain('notification_delayed');
  });

  test('whether the notification went out is recorded on the row', () => {
    expect(handler).toContain('email_delivered');
    expect(handler).toContain('email_error');
  });
});
