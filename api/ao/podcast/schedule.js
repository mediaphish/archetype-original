import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import {
  listUpcomingScheduleSlots,
  createScheduleSlot,
  getScheduleSlotById,
} from '../../../lib/ao/podcastScheduleStore.js';
import { getGuestById } from '../../../lib/ao/guestIntakeStore.js';
import { localDateTimeToIso } from '../../../lib/ao/podcastScheduleUtils.js';
import { sendRecordingConfirmationEmail } from '../../../lib/ao/podcastScheduleEmail.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const result = await listUpcomingScheduleSlots();
      if (!result.ok) {
        const status = result.error === 'schedule_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }
      return res.status(200).json({ ok: true, slots: result.slots });
    } catch (err) {
      console.error('[ao/podcast/schedule GET]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const date = String(body.date || '').trim();
      const time = String(body.time || '').trim();
      const timezone = String(body.timezone || '').trim() || null;
      if (!date || !time) {
        return res.status(400).json({ ok: false, error: 'date and time are required' });
      }

      const scheduledAt = localDateTimeToIso(date, time, timezone);
      if (!scheduledAt) {
        return res.status(400).json({ ok: false, error: 'Invalid date, time, or timezone' });
      }

      const result = await createScheduleSlot({
        guest_id: body.guest_id || null,
        episode_title: String(body.episode_title || '').trim() || null,
        scheduled_at: scheduledAt,
        timezone,
        notes: String(body.notes || '').trim() || null,
      });

      if (!result.ok) {
        const status = result.error === 'schedule_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }

      let emailSent = false;
      let emailError = null;
      if (body.send_confirmation_email && result.slot?.guest_id) {
        const guestResult = await getGuestById(result.slot.guest_id);
        if (guestResult.ok && guestResult.guest) {
          const mail = await sendRecordingConfirmationEmail({
            guest: guestResult.guest,
            slot: result.slot,
          });
          emailSent = mail.ok;
          if (!mail.ok) emailError = mail.error;
        } else {
          emailError = 'guest_not_found';
        }
      }

      return res.status(200).json({
        ok: true,
        slot: result.slot,
        email_sent: emailSent,
        email_error: emailError,
      });
    } catch (err) {
      console.error('[ao/podcast/schedule POST]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
