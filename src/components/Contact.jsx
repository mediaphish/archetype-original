/**
 * Contact Section
 * v0 Design - EXACT IMPLEMENTATION
 */
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
    <section className="py-32 bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-12 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2B2D2F] mb-8 text-center">
            Contact
          </h2>
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#2B2D2F] mb-2">Name</label>
              <input 
                type="text"
                className="w-full rounded-lg border-2 border-[#E0E0E0] px-4 py-3 text-[#2B2D2F] focus:outline-none focus:border-[#C85A3C] transition-colors duration-200"
                value={state.name}
                onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2B2D2F] mb-2">Email</label>
              <input 
                type="email"
                className="w-full rounded-lg border-2 border-[#E0E0E0] px-4 py-3 text-[#2B2D2F] focus:outline-none focus:border-[#C85A3C] transition-colors duration-200"
                value={state.email}
                onChange={(e) => setState(s => ({ ...s, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2B2D2F] mb-2">Message</label>
              <textarea 
                rows={6}
                className="w-full rounded-lg border-2 border-[#E0E0E0] px-4 py-3 text-[#2B2D2F] focus:outline-none focus:border-[#C85A3C] transition-colors duration-200 resize-none"
                value={state.message}
                onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={status.loading}
              className="w-full bg-[#C85A3C] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#B54A32] transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              {status.loading ? "Sending…" : "Send"}
            </button>
            {status.ok === true && <p className="text-green-600 text-sm text-center">{status.msg}</p>}
            {status.ok === false && <p className="text-red-600 text-sm text-center">{status.msg}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
