import React, { useEffect, useMemo, useState, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function fmtDate(iso) {
  try {
    return iso ? new Date(iso).toLocaleString() : '—';
  } catch (_) {
    return '—';
  }
}

function Badge({ children, tone = 'gray' }) {
  const map = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
}

export default function Import() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedBatchLoading, setSelectedBatchLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchItems, setSelectedBatchItems] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [groupPostingId, setGroupPostingId] = useState(null);
  const [groupPostResult, setGroupPostResult] = useState({}); // { [itemId]: { ok: boolean, error?: string, postId?: string } }

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          window.location.replace('/ao/login');
          return;
        }
        if (!cancelled) {
          setEmail(json.email || '');
          setAuthChecked(true);
        }
      } catch (_) {
        window.location.replace('/ao/login');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchBatches = useCallback(async () => {
    if (!authChecked) return;
    setBatchesLoading(true);
    try {
      const res = await fetch('/api/ao/import/batches');
      const json = await res.json().catch(() => ({}));
      if (json.ok && Array.isArray(json.batches)) {
        setBatches(json.batches);
      }
    } catch (_) {}
    setBatchesLoading(false);
  }, [authChecked]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const openBatch = useCallback(async (id) => {
    if (!id) return;
    setSelectedBatchId(id);
    setSelectedBatchLoading(true);
    setSelectedBatch(null);
    setSelectedBatchItems([]);
    setPublishError('');
    try {
      const res = await fetch(`/api/ao/import/batches/${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        setSelectedBatch(json.batch || null);
        setSelectedBatchItems(Array.isArray(json.items) ? json.items : []);
        setGroupPostResult({});
      }
    } catch (_) {}
    setSelectedBatchLoading(false);
  }, []);

  const validatedCount = useMemo(
    () => selectedBatchItems.filter((i) => i.status === 'validated').length,
    [selectedBatchItems]
  );
  const rejectedCount = useMemo(
    () => selectedBatchItems.filter((i) => i.status === 'rejected').length,
    [selectedBatchItems]
  );

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setUploadResult(null);
    setUploadError('');
  };

  const handleUpload = async () => {
    if (uploading) return;
    if (!selectedFiles.length) {
      setUploadError('Pick one or more markdown files first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const filesPayload = [];
      for (const f of selectedFiles) {
        const text = await f.text();
        filesPayload.push({ name: f.name, content: text });
      }
      const res = await fetch('/api/ao/import/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'devotional', notes: notes.trim() || null, files: filesPayload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setUploadError(json.error || 'Upload failed');
      } else {
        setUploadResult(json);
        setSelectedFiles([]);
        setNotes('');
        await fetchBatches();
        if (json.batch?.id) {
          await openBatch(json.batch.id);
        }
      }
    } catch (e2) {
      setUploadError(e2.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handlePublish = async () => {
    if (!selectedBatchId || publishing) return;
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/ao/import/batches/${encodeURIComponent(selectedBatchId)}/publish`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPublishError(json.error || 'Publish failed');
      } else {
        await fetchBatches();
        await openBatch(selectedBatchId);
      }
    } catch (e) {
      setPublishError(e.message || 'Publish failed');
    }
    setPublishing(false);
  };

  const handleTryPostToGroup = async (item) => {
    if (!item?.id || groupPostingId) return;
    const text = String(item.group_ready_text || '').trim();
    if (!text) return;
    setGroupPostingId(item.id);
    try {
      const res = await fetch('/api/providers/facebook/group-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setGroupPostResult((p) => ({ ...p, [item.id]: { ok: true, postId: json.postId } }));
      } else {
        setGroupPostResult((p) => ({ ...p, [item.id]: { ok: false, error: json.error || 'Group post failed' } }));
      }
    } catch (e) {
      setGroupPostResult((p) => ({ ...p, [item.id]: { ok: false, error: e.message || 'Group post failed' } }));
    } finally {
      setGroupPostingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="import" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import</h1>
        <p className="text-gray-600 mb-8">Upload devotionals in batches, review validation, then publish when ready.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload a devotional batch</h2>

            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Example: “Week 12 devotionals”"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Files</label>
              <input
                type="file"
                multiple
                accept=".md,text/markdown"
                onChange={onPickFiles}
                className="block w-full text-sm text-gray-700"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{selectedFiles.length} file(s) selected</p>
                  <ul className="mt-1 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                    {selectedFiles.map((f) => (
                      <li key={f.name}>{f.name} <span className="text-gray-400">({Math.round(f.size / 1024)} KB)</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                {uploadError}
              </div>
            )}

            {uploadResult?.batch && (
              <div className="mt-4 p-3 rounded border border-green-200 bg-green-50 text-green-900 text-sm">
                Uploaded batch. Validated: <strong>{uploadResult.batch.validated_count}</strong>, Rejected: <strong>{uploadResult.batch.rejected_count}</strong>.
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!authChecked || uploading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload batch'}
            </button>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Batches</h2>
            {batchesLoading ? (
              <LoadingSpinner />
            ) : batches.length === 0 ? (
              <p className="text-gray-500 text-sm">No batches yet.</p>
            ) : (
              <ul className="space-y-3">
                {batches.map((b) => (
                  <li key={b.id} className={`border rounded p-4 ${selectedBatchId === b.id ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.notes || `Batch ${String(b.id).slice(0, 8)}`}</p>
                        <p className="text-xs text-gray-500">Created {fmtDate(b.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={b.status === 'published' ? 'green' : b.status === 'failed' ? 'red' : 'gray'}>{b.status}</Badge>
                        <button
                          type="button"
                          onClick={() => openBatch(b.id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      <Badge tone="blue">Total: {b.counts?.total ?? 0}</Badge>
                      <Badge tone="green">Validated: {b.counts?.validated ?? 0}</Badge>
                      <Badge tone="red">Rejected: {b.counts?.rejected ?? 0}</Badge>
                    </div>
                    {b.status === 'published' && b.publish_commit_sha && (
                      <p className="mt-2 text-xs text-gray-600">Published commit: <span className="font-mono">{String(b.publish_commit_sha).slice(0, 10)}</span></p>
                    )}
                    {b.status === 'failed' && b.publish_error && (
                      <p className="mt-2 text-xs text-red-700">Publish error: {b.publish_error}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch detail</h2>
          {!selectedBatchId ? (
            <p className="text-gray-500 text-sm">Select a batch to review it.</p>
          ) : selectedBatchLoading ? (
            <LoadingSpinner />
          ) : !selectedBatch ? (
            <p className="text-gray-500 text-sm">Batch not found.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Batch</p>
                  <p className="font-medium text-gray-900">{selectedBatch.notes || selectedBatch.id}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                    <Badge tone="blue">Validated: {validatedCount}</Badge>
                    <Badge tone="red">Rejected: {rejectedCount}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={selectedBatch.status === 'published' ? 'green' : selectedBatch.status === 'failed' ? 'red' : 'gray'}>{selectedBatch.status}</Badge>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || selectedBatch.status === 'published' || validatedCount === 0}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {publishing ? 'Publishing…' : 'Publish validated items'}
                  </button>
                </div>
              </div>

              {publishError && (
                <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                  {publishError}
                </div>
              )}

              <div className="space-y-3">
                {selectedBatchItems.map((it) => (
                  <div key={it.id} className="border border-gray-200 rounded p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{it.filename}</p>
                        <p className="text-xs text-gray-500 truncate">Target: {it.target_path}</p>
                      </div>
                      <Badge tone={it.status === 'validated' ? 'green' : it.status === 'rejected' ? 'red' : it.status === 'published' ? 'green' : 'gray'}>{it.status}</Badge>
                    </div>
                    {it.status === 'rejected' && Array.isArray(it.validation_errors) && it.validation_errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded p-3 list-disc list-inside space-y-1">
                        {it.validation_errors.slice(0, 12).map((e, idx) => (
                          <li key={idx}>{String(e)}</li>
                        ))}
                      </ul>
                    )}
                    {it.group_ready_text && (
                      <details className="mt-3 border border-gray-200 rounded bg-gray-50 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-800">Facebook Group post (copy/paste ready)</summary>
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => { try { await navigator.clipboard.writeText(String(it.group_ready_text)); } catch (_) {} }}
                              className="text-xs px-2 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Copy text
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTryPostToGroup(it)}
                              disabled={groupPostingId === it.id}
                              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {groupPostingId === it.id ? 'Posting…' : 'Try post to Group'}
                            </button>
                            {it.public_url && (
                              <a href={it.public_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                Open public link
                              </a>
                            )}
                          </div>
                          <pre className="text-xs whitespace-pre-wrap bg-white border border-gray-200 rounded p-3 text-gray-800">{String(it.group_ready_text)}</pre>
                          {groupPostResult[it.id]?.ok && (
                            <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">
                              Group post published. Post ID: {groupPostResult[it.id].postId}
                            </div>
                          )}
                          {groupPostResult[it.id] && !groupPostResult[it.id].ok && (
                            <div className="text-sm text-yellow-900 bg-yellow-50 border border-yellow-200 rounded p-2">
                              Auto-post didn’t work. You can still copy/paste above. {groupPostResult[it.id].error ? `(${groupPostResult[it.id].error})` : ''}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {selectedBatchItems.length === 0 && (
                  <p className="text-gray-500 text-sm">No items in this batch.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

