/**
 * The CRM for Bart's screens (notes/PLAN-crm.md). Server logic in
 * lib/calendly/crm.js; the person detail and its actions stay in
 * api/ao/clients.js.
 *
 * GET ?view=today | people (q, relationship, stage, quiet, owner) | pipeline | person (email)
 * POST { action: 'update', email, relationship?, source?, next_step?, stage?, note? }
 *      { action: 'add', email, name, phone?, relationship?, source?, note? }
 */
import { requireOwnerSession } from '../../lib/ao/requireAoSession.js';
import { getToday, getPeople, getPipeline, getCrmPerson, updateCrm, addContact } from '../../lib/calendly/crm.js';

export default async function handler(req, res) {
  const auth = requireOwnerSession(req, res);
  if (!auth) return;
  try {
    if (req.method === 'GET') {
      const view = String(req.query?.view || 'today');
      if (view === 'today') return res.status(200).json(await getToday());
      if (view === 'people') {
        return res.status(200).json(
          await getPeople({
            q: req.query?.q || '',
            relationship: req.query?.relationship || '',
            stage: req.query?.stage || '',
            quiet: req.query?.quiet === '1',
            owner: req.query?.owner || '',
          })
        );
      }
      if (view === 'pipeline') return res.status(200).json(await getPipeline());
      if (view === 'person') return res.status(200).json(await getCrmPerson(String(req.query?.email || '')));
      return res.status(400).json({ ok: false, error: 'Unknown view' });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const body = req.body || {};
    if (body.action === 'update') {
      const { action, email, ...change } = body;
      return res.status(200).json(await updateCrm(email, change, { by: 'bart' }));
    }
    if (body.action === 'add') return res.status(200).json(await addContact(body));
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error('[crm]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
}
