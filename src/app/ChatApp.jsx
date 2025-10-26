import React, { useEffect, useMemo, useRef, useState } from "react";
import DarkHoursBanner from "./components/DarkHoursBanner.jsx";
import QuickPrompts from "./components/QuickPrompts.jsx";
import MessageBubble from "./components/MessageBubble.jsx";
import EscalationButton from "./components/EscalationButton.jsx";
import { isDarkHours, cstNow } from "./utils/darkHours.js";

export default function ChatApp() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to Archetype Original. How can I help? Choose a quick prompt or type your question.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalationOffered, setEscalationOffered] = useState(false); // toggled by assistant (later)
  const endRef = useRef(null);

  const dark = useMemo(() => isDarkHours(cstNow()), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          meta: { source: "ao-app", darkHours: dark },
        }),
      });
      const data = await res.json();
      if (res.ok && data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply, ts: Date.now() }]);
        if (data?.escalationOffered) setEscalationOffered(true);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "I hit a snag replying. You can try again, or request a human handoff and I’ll queue it.",
            ts: Date.now(),
          },
        ]);
        setEscalationOffered(true);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network issue—please try again.", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function requestHandoff() {
    setLoading(true);
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: "User requested escalation from /app shell.",
          lastMessage: messages[messages.length - 1]?.content || "",
          darkHours: dark,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: dark
              ? "Got it. I’ll queue your handoff and our team will follow up after 10:00am CST."
              : "Got it. I’ll notify our team right now.",
            ts: Date.now(),
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Couldn’t create a handoff just now. Please email us via the contact form.",
            ts: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network issue—try again shortly.", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container py-4 flex items-center justify-between">
          <a href="/" className="font-semibold">Archetype Original</a>
          <nav className="text-sm flex items-center gap-4">
            <a className="underline" href="/">Home</a>
            <a className="underline" href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <DarkHoursBanner />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <QuickPrompts onPick={send} />

          <div className="mt-6 space-y-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} text={m.content} />
            ))}
            {loading && (
              <div className="text-sm text-slate-500 animate-pulse">Thinking…</div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="mt-6 flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="input flex-1"
              placeholder="Ask anything about business growth, leadership, culture, or Bart…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary" disabled={loading || !input.trim()} type="submit">
              Send
            </button>
          </form>

          <div className="mt-4">
            <EscalationButton
              visible={escalationOffered}
              onClick={requestHandoff}
              disabled={loading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
