"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChartResponse } from "@/lib/api";
import type { BirthData, Intent } from "@/lib/astroChat/types";

// ── Message types ─────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  streaming?: boolean;
}

interface Props {
  sessionId: string;
  chart: ChartResponse;
  birthData: BirthData;
  initialMessages?: ChatMessage[];
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Converts **bold** and bullet points — no full markdown lib needed.

function renderAnswer(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    // Bold headers: **text**
    const boldHeader = /^\*\*(.+)\*\*$/.test(line.trim());
    if (boldHeader) {
      const content = line.trim().replace(/^\*\*/, "").replace(/\*\*$/, "");
      elements.push(
        <p key={key++} className="font-semibold text-amber-300 mt-4 mb-1">
          {content}
        </p>
      );
      continue;
    }

    // Bullet points
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      const content = line.trim().replace(/^[•\-]\s*/, "");
      // Inline bold within bullets
      const parts = content.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={key++} className="ml-3 text-slate-300 text-sm leading-relaxed">
          <span className="text-amber-500 mr-1">•</span>
          {parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-slate-100">{part}</strong> : part
          )}
        </p>
      );
      continue;
    }

    // Inline bold in normal lines
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={key++} className="text-slate-300 text-sm leading-relaxed">
          {parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-slate-100">{part}</strong> : part
          )}
        </p>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Plain text
    elements.push(
      <p key={key++} className="text-slate-300 text-sm leading-relaxed">
        {line}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Life theme badge ──────────────────────────────────────────────────────────

const THEME_LABELS: Record<string, string> = {
  marriage:       "💕 Marriage",
  career:         "💼 Career",
  finances:       "💰 Finances",
  health:         "🌿 Health",
  children:       "👶 Children",
  foreign_travel: "✈️ Travel",
  property:       "🏠 Property",
  spirituality:   "🕉️ Spirituality",
  dasha:          "⏳ Dasha",
  yoga:           "✨ Yoga",
  transit:        "🌍 Transit",
  general:        "🔭 General",
};

function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
        {THEME_LABELS[intent.lifeTheme] ?? intent.lifeTheme}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
        {intent.tense}
      </span>
      {intent.wantsTiming && (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          ⏱ timing
        </span>
      )}
    </div>
  );
}

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  "When will I get married?",
  "When is my next career growth window?",
  "What does my current dasha say about finances?",
  "Which yogas are active in my chart?",
  "Is this a good time to travel abroad?",
];

// ── Main component ────────────────────────────────────────────────────────────

export function AstroChatInterface({ sessionId, chart, birthData, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);
      setStreamingId(assistantId);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/astro-chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: text.trim(),
            chart,
            birthData,
          }),
          signal: abort.signal,
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.token }
                      : m
                  )
                );
              } else if (event.type === "intent") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, intent: event.intent }
                      : m
                  )
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, streaming: false, id: event.messageId ?? m.id }
                      : m
                  )
                );
              } else if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `⚠️ ${event.error}`, streaming: false }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "⚠️ Connection error. Please try again.", streaming: false }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [sessionId, chart, birthData, isStreaming]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center space-y-6 py-10">
            <div>
              <p className="text-2xl">🔭</p>
              <h2 className="text-lg font-semibold text-amber-400 mt-2">Ask the Jyotish Guru</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chart-grounded answers using Jaimini, Parashari &amp; Ashtakvarga
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600 uppercase tracking-wider">Try asking</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[80%] bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tr-sm px-4 py-3">
                <p className="text-sm text-slate-200">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[92%] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🕉️</span>
                  <span className="text-[11px] text-amber-500 font-medium">Jyotish Guru</span>
                  {msg.streaming && (
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {msg.intent && <IntentBadge intent={msg.intent} />}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-4">
                  {msg.content ? (
                    renderAnswer(msg.content)
                  ) : (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-amber-500/60 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your chart — marriage, career, dashas, yogas…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-10 h-10 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-black rounded-xl flex items-center justify-center transition-colors"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line · {chart.lagna} lagna chart loaded
        </p>
      </div>
    </div>
  );
}
