import React, { useEffect, useState } from 'react';

export default function PostRecordingCapture({ guestId, guest, onSaved }) {
  const hasNotes =
    Boolean(guest?.post_recording_surprise) ||
    Boolean(guest?.post_recording_follow_up) ||
    Boolean(guest?.post_recording_landed);

  const [editing, setEditing] = useState(!hasNotes);
  const [form, setForm] = useState({
    post_recording_surprise: guest?.post_recording_surprise || '',
    post_recording_follow_up: guest?.post_recording_follow_up || '',
    post_recording_landed: guest?.post_recording_landed || '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', message: '' });

  useEffect(() => {
    setForm({
      post_recording_surprise: guest?.post_recording_surprise || '',
      post_recording_follow_up: guest?.post_recording_follow_up || '',
      post_recording_landed: guest?.post_recording_landed || '',
    });
    const notesExist =
      Boolean(guest?.post_recording_surprise) ||
      Boolean(guest?.post_recording_follow_up) ||
      Boolean(guest?.post_recording_landed);
    setEditing(!notesExist);
  }, [guest]);

  const formatTimestamp = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', message: '' });
    try {
      const res = await fetch('/api/ao/podcast/guest-post-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          ...form,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save notes');
      setStatus({ loading: false, error: '', message: 'Notes saved.' });
      setEditing(false);
      onSaved?.(json.guest);
    } catch (err) {
      setStatus({ loading: false, error: err.message || 'Could not save notes', message: '' });
    }
  };

  if (!editing && hasNotes) {
    return (
      <div className="space-y-4">
        {guest.post_recording_captured_at && (
          <p className="text-xs text-gray-500">
            Captured {formatTimestamp(guest.post_recording_captured_at)}
          </p>
        )}
        {guest.post_recording_surprise && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">What surprised you</p>
            <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{guest.post_recording_surprise}</p>
          </div>
        )}
        {guest.post_recording_follow_up && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              What do you want to explore further
            </p>
            <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{guest.post_recording_follow_up}</p>
          </div>
        )}
        {guest.post_recording_landed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              What landed that you didn&apos;t expect
            </p>
            <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{guest.post_recording_landed}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900">What surprised you</label>
        <textarea
          rows={3}
          value={form.post_recording_surprise}
          onChange={(e) => setForm((f) => ({ ...f, post_recording_surprise: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900">
          What do you want to explore further
        </label>
        <textarea
          rows={3}
          value={form.post_recording_follow_up}
          onChange={(e) => setForm((f) => ({ ...f, post_recording_follow_up: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900">
          What landed that you didn&apos;t expect
        </label>
        <textarea
          rows={3}
          value={form.post_recording_landed}
          onChange={(e) => setForm((f) => ({ ...f, post_recording_landed: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {status.error && <p className="text-sm text-red-600">{status.error}</p>}
      {status.message && <p className="text-sm text-green-700">{status.message}</p>}
      <button
        type="submit"
        disabled={status.loading}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {status.loading ? 'Saving…' : 'Save notes'}
      </button>
    </form>
  );
}
