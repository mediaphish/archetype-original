/**
 * Contact Section / Final CTA
 * Editorial Minimal Design - Orange Border Frame
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
    <section className="py-16 sm:py-20 md:py-32 lg:py-40 bg-[#FAFAF9]">
      <div className="container mx-auto px-4 sm:px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          <div className="border-[6px] border-[#C85A3C] p-8 sm:p-10 md:p-12">
            <h2 className="text-[48px] sm:text-[64px] md:text-[72px] lg:text-[96px] font-bold text-[#1A1A1A] mb-6 sm:mb-8 md:mb-10 font-serif tracking-tight text-balance text-center">
              Contact
            </h2>
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
                <input 
                  type="text"
                  className="w-full border border-[#1A1A1A]/10 px-4 py-3 text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A] transition-colors min-h-[44px]"
                  value={state.name}
                  onChange={(e) => setState(s => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email</label>
                <input 
                  type="email"
                  className="w-full border border-[#1A1A1A]/10 px-4 py-3 text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A] transition-colors min-h-[44px]"
                  value={state.email}
                  onChange={(e) => setState(s => ({ ...s, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Message</label>
                <textarea 
                  rows={6}
                  className="w-full border border-[#1A1A1A]/10 px-4 py-3 text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none min-h-[140px]"
                  value={state.message}
                  onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={status.loading}
                className="w-full bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {status.loading ? "Sending…" : "Send"}
              </button>
              {status.ok === true && <p className="text-green-600 text-sm text-center">{status.msg}</p>}
              {status.ok === false && <p className="text-red-600 text-sm text-center">{status.msg}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
