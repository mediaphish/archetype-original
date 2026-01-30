import React, { useState } from 'react';

export default function CannotAnswerContactForm({ question, onSuccess, onSkip }) {
  const [state, setState] = useState({ name: "", phone: "", email: "" });
  const [status, setStatus] = useState({ loading: false, ok: null, msg: "" });

  async function submit(e) {
    e.preventDefault();
    setStatus({ loading: true, ok: null, msg: "" });
    try {
      const res = await fetch("/api/chat/cannot-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          name: state.name,
          phone: state.phone || null,
          email: state.email
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ loading: false, ok: true, msg: "Thanks! Bart will get back to you soon." });
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
      <h3 className="text-lg font-semibold text-warm-charcoal mb-2">Get in Touch</h3>
      <p className="text-sm text-warm-charcoal/70 mb-4">
        I'd love to connect you with Bart so he can answer your question directly.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-warm-charcoal mb-1">
            Name <span className="text-red-500">*</span>
          </label>
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
          <label className="block text-sm font-medium text-warm-charcoal mb-1">Phone</label>
          <input 
            type="tel"
            className="w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-warm-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber"
            value={state.phone}
            onChange={(e) => setState(s => ({ ...s, phone: e.target.value }))}
            disabled={status.loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-warm-charcoal mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input 
            type="email"
            className="w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-warm-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-amber"
            value={state.email}
            onChange={(e) => setState(s => ({ ...s, email: e.target.value }))}
            required
            disabled={status.loading}
          />
        </div>
        <div className="flex gap-2">
          <button 
            type="submit"
            disabled={status.loading || !state.name.trim() || !state.email.trim()}
            className="min-h-[44px] flex-1 bg-amber text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {status.loading ? "Sending…" : "Send to Bart"}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={status.loading}
              className="min-h-[44px] px-4 py-2 text-sm text-warm-charcoal/70 hover:text-warm-charcoal transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              Skip
            </button>
          )}
        </div>
        {status.ok === true && <p className="text-green-600 text-sm text-center mt-2">{status.msg}</p>}
        {status.ok === false && <p className="text-red-600 text-sm text-center mt-2">{status.msg}</p>}
      </form>
    </div>
  );
}

