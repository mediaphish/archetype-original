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
      if (res.ok) setStatus({ loading: false, ok: true, msg: "Message sent. I’ll respond soon." });
      else setStatus({ loading: false, ok: false, msg: data?.error || "Something went wrong." });
      if (res.ok) setState({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus({ loading: false, ok: false, msg: "Network error." });
    }
  }

  return (
    <section id="contact" className="section bg-slate-50">
      <div className="container">
        <h2 className="h2">Contact</h2>
        <form onSubmit={submit} className="card p-6 mt-6 grid gap-4 max-w-2xl">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" required value={state.name}
              onChange={(e) => setState(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" required value={state.email}
              onChange={(e) => setState(s => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="message">Message</label>
            <textarea id="message" className="textarea" required value={state.message}
              onChange={(e) => setState(s => ({ ...s, message: e.target.value }))}></textarea>
          </div>
          <div className="flex items-center gap-3">
            <button disabled={status.loading} className="btn btn-primary" type="submit">
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
