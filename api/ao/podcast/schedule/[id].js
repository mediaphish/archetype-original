import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { deleteScheduleSlot, getScheduleSlotById } from '../../../../lib/ao/podcastScheduleStore.js';
import { getGuestById } from '../../../../lib/ao/guestIntakeStore.js';
import { sendRecordingConfirmationEmail } from '../../../../lib/ao/podcastScheduleEmail.js';

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = String(req.query?.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  if (req.method === 'DELETE') {
    try {
      const result = await deleteScheduleSlot(id);
      if (!result.ok) {
        const status = result.error === 'schedule_table_missing' ? 503 : 500;
        return res.status(status).json({ ok: false, error: result.error });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[ao/podcast/schedule DELETE]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (body.action !== 'send_confirmation') {
        return res.status(400).json({ ok: false, error: 'Unknown action' });
      }

      const slotResult = await getScheduleSlotById(id);
      if (!slotResult.ok) {
        const status =
          slotResult.error === 'schedule_table_missing'
            ? 503
            : slotResult.error === 'slot_not_found'
              ? 404
              : 500;
        return res.status(status).json({ ok: false, error: slotResult.error });
      }

      const slot = slotResult.slot;
      if (!slot.guest_id) {
        return res.status(400).json({ ok: false, error: 'no_guest_on_slot' });
      }

      const guestResult = await getGuestById(slot.guest_id);
      if (!guestResult.ok || !guestResult.guest) {
        return res.status(404).json({ ok: false, error: 'guest_not_found' });
      }

      const mail = await sendRecordingConfirmationEmail({
        guest: guestResult.guest,
        slot,
      });

      if (!mail.ok) {
        const status = mail.error === 'email_not_configured' ? 500 : 400;
        return res.status(status).json({ ok: false, error: mail.error });
      }

      return res.status(200).json({ ok: true, email_sent: true });
    } catch (err) {
      console.error('[ao/podcast/schedule POST confirm]', err);
      return res.status(500).json({ ok: false, error: err.message || 'Server error' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
