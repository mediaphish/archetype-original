import React, { useState } from "react";

export default function Contact() {
  const [state, setState] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState({ loading: false, ok: null, msg: "" });

  async function submit(e) {
    e.preventDefault();
    setStatus({ loading: true, ok: null, msg: "" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (res.ok) setStatus({ loading: false, ok: true, msg: "Message sent. I'll respond soon." });
      else setStatus({ loading: false, ok: false, msg: data?.error || "Something went wrong." });
      if (res.ok) setState({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus({ loading: false, ok: false, msg: "Network error." });
    }
  }

  return (
    <section id="contact" className="py-20 md:py-32 bg-light-grey">
      <div className="container max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-charcoal mb-12 text-center">Contact</h2>
        <form onSubmit={submit} className="card-modern max-w-2xl mx-auto space-y-6">
          <div>
            <label className="label text-charcoal" htmlFor="name">Name</label>
            <input 
              id="name" 
              className="w-full rounded-lg border-2 border-gray-200 focus:border-archy-orange focus:outline-none px-4 py-3 transition-colors" 
              required 
              value={state.name}
              onChange={(e) => setState(s => ({ ...s, name: e.target.value }))} 
            />
          </div>
          <div>
            <label className="label text-charcoal" htmlFor="email">Email</label>
            <input 
              id="email" 
              type="email" 
              className="w-full rounded-lg border-2 border-gray-200 focus:border-archy-orange focus:outline-none px-4 py-3 transition-colors" 
              required 
              value={state.email}
              onChange={(e) => setState(s => ({ ...s, email: e.target.value }))} 
            />
          </div>
          <div>
            <label className="label text-charcoal" htmlFor="message">Message</label>
            <textarea 
              id="message" 
              className="w-full rounded-lg border-2 border-gray-200 focus:border-archy-orange focus:outline-none px-4 py-3 min-h-[140px] transition-colors" 
              required 
              value={state.message}
              onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}
            ></textarea>
          </div>
          <div className="flex items-center gap-3">
            <button 
              disabled={status.loading} 
              className="btn-primary min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              aria-label={status.loading ? "Sending message" : "Send message"}
            >
              {status.loading ? "Sending…" : "Send"}
            </button>
            {status.ok === true && <span className="text-green-600 text-sm">{status.msg}</span>}
            {status.ok === false && <span className="text-red-600 text-sm">{status.msg}</span>}
          </div>
        </form>
      </div>
    </section>
  );
}
