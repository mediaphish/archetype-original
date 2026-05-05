import React, { useEffect, useRef, useState } from 'react';

export default function InlineContactForm({ onSuccess }) {
  const formLoadedAtRef = useRef(null);
  const [trapField, setTrapField] = useState('');
  useEffect(() => {
    if (formLoadedAtRef.current == null) formLoadedAtRef.current = Date.now();
  }, []);

  const [state, setState] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState({ loading: false, ok: null, msg: "" });

  async function submit(e) {
    e.preventDefault();
    setStatus({ loading: true, ok: null, msg: "" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          form_loaded_at: formLoadedAtRef.current,
          _trap: trapField,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ loading: false, ok: true, msg: "Message sent! Bart will respond soon." });
        setState({ name: "", email: "", message: "" });
        setTrapField("");
        if (onSuccess) {
          setTimeout(() => onSuccess(), 2000);
        }
      } else {
        setStatus({ loading: false, ok: false, msg: data?.error || "Something went wrong." });
      }
    } catch (err) {
      setStatus({ loading: false, ok: false, msg: "Network error. Please try again." });
    }
  }

  return (
    <div className="mt-4 p-4 bg-white border border-warm-border rounded-lg">
      <h3 className="text-lg font-semibold text-warm-charcoal mb-4">Contact Bart</h3>
      <form onSubmit={submit} className="relative space-y-4">
        <div
          className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <label htmlFor="inline-contact-trap">Leave blank</label>
          <input
            id="inline-contact-trap"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={trapField}
            onChange={(e) => setTrapField(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-warm-charcoal mb-1">Name</label>
          <input 
            type="text"
            className="w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-warm-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber"
            value={state.name}
            onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
            required
            disabled={status.loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-warm-charcoal mb-1">Email</label>
          <input 
            type="email"
            className="w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-warm-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber"
            value={state.email}
            onChange={(e) => setState(s => ({ ...s, email: e.target.value }))}
            required
            disabled={status.loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-warm-charcoal mb-1">Message</label>
          <textarea 
            rows={4}
            className="w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-warm-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber resize-none"
            value={state.message}
            onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}
            required
            disabled={status.loading}
          />
        </div>
        <button 
          type="submit"
          disabled={status.loading}
          className="min-h-[44px] w-full bg-amber text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {status.loading ? "Sending…" : "Send Message"}
        </button>
        {status.ok === true && <p className="text-green-600 text-sm text-center mt-2">{status.msg}</p>}
        {status.ok === false && <p className="text-red-600 text-sm text-center mt-2">{status.msg}</p>}
      </form>
    </div>
  );
}

