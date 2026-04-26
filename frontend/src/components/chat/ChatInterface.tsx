"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  saved?: boolean;
}

interface ChatInterfaceProps {
  sessionId: string;
  /// Wallet aggregate — pooled across ALL the user's chat threads.
  questionsUsed: number;
  questionLimit: number;
  initialMessages: Message[];
  onUpgrade: () => void;
  /// Notify parent to refresh wallet from /api/chat/balance after each
  /// successful answer (the message route returns the new aggregate).
  onQuestionAnswered?: () => void;
}

function formatMarkdown(text: string): string {
  // Simple markdown-like formatting for display
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• /gm, '<span class="text-amber-500">•</span> ')
    .replace(/---/g, '<hr class="border-slate-700 my-2">')
    .replace(/\n/g, "<br>");
}

export function ChatInterface({
  sessionId,
  questionsUsed: initialUsed,
  questionLimit,
  initialMessages,
  onUpgrade,
  onQuestionAnswered,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(initialUsed);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExhausted = questionsUsed >= questionLimit;
  const isUnlimited = questionLimit >= 999999;
  const remaining = isUnlimited ? "∞" : Math.max(0, questionLimit - questionsUsed);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading || isExhausted) return;

    setInput("");
    setError(null);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message");
        // Remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        return;
      }

      // Replace optimistic message with real one, add assistant response
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ]);
      setQuestionsUsed(data.questionsUsed);
      // Wallet may have shifted (FIFO consume from oldest balance) — let
      // the parent refresh its aggregate so "Buy more" CTA is accurate.
      onQuestionAnswered?.();
    } catch {
      setError("Network error — please try again.");
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSaved = async (msg: Message) => {
    if (msg.role !== "assistant" || msg.id.startsWith("temp-")) return;
    const next = !msg.saved;
    setTogglingId(msg.id);
    // Optimistic update
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, saved: next } : m)));
    try {
      const res = await fetch(`/api/chat/message/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      // Revert on error
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, saved: !next } : m)));
    } finally {
      setTogglingId(null);
    }
  };

  const handleClearChat = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/chat/session/${sessionId}/messages`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear");
      // Keep only saved assistant messages + the user question that preceded each
      setMessages((prev) => {
        const keepIds = new Set<string>();
        for (let i = 0; i < prev.length; i++) {
          const m = prev[i];
          if (m.role === "assistant" && m.saved) {
            keepIds.add(m.id);
            for (let j = i - 1; j >= 0; j--) {
              if (prev[j].role === "user") {
                keepIds.add(prev[j].id);
                break;
              }
            }
          }
        }
        return prev.filter((m) => keepIds.has(m.id));
      });
    } catch {
      setError("Couldn't clear chat — try again");
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 gap-2">
        <h3 className="text-sm font-medium text-slate-300 flex-shrink-0">
          Ask about your chart
        </h3>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs text-slate-500 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-md transition-colors"
              title="Delete unsaved messages; bookmarked answers stay"
            >
              {"\u{1F9F9}"} Clear chat
            </button>
          )}
          <span className="text-xs text-slate-500">
            {isUnlimited ? (
              <span className="text-emerald-400">Unlimited questions</span>
            ) : (
              <>
                <span className="text-amber-400 font-medium">{remaining}</span>
                {" "}question{remaining === 1 ? "" : "s"} remaining
                {" "}<span className="text-slate-500">(across all your charts)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Clear-chat confirm bar */}
      {confirmingClear && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-rose-200">
            Clear this conversation? Your <strong>bookmarked answers</strong> stay; everything else is deleted.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              disabled={clearing}
              className="text-xs bg-rose-500/20 text-rose-100 border border-rose-500/40 hover:bg-rose-500/30 px-2.5 py-1 rounded-md disabled:opacity-50"
            >
              {clearing ? "Clearing\u2026" : "Yes, clear"}
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              disabled={clearing}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">🪐</p>
            <p className="text-slate-400 text-sm">
              Ask any question about your birth chart — career, marriage, health, wealth, timing of events, and more.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "How is my career looking?",
                "When will I get married?",
                "Tell me about my health",
                "What does my chart say about wealth?",
                "Give me an overview of my chart",
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex group ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${
                msg.role === "user"
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-100"
                  : msg.saved
                    ? "bg-slate-800 border border-amber-500/40 text-slate-300 ring-1 ring-amber-500/20"
                    : "bg-slate-800 border border-slate-700 text-slate-300"
              }`}
            >
              {msg.role === "assistant" ? (
                <>
                  <div
                    className="space-y-1 [&_strong]:font-semibold [&_hr]:my-3"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {!msg.id.startsWith("temp-") && (
                    <button
                      onClick={() => toggleSaved(msg)}
                      disabled={togglingId === msg.id}
                      className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-colors ${
                        msg.saved
                          ? "bg-amber-500 border-amber-400 text-black"
                          : "bg-slate-900 border-slate-700 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:border-amber-500/40"
                      } disabled:opacity-50`}
                      title={msg.saved ? "Saved — click to unsave" : "Save this answer"}
                      aria-label={msg.saved ? "Unsave answer" : "Save answer"}
                    >
                      {msg.saved ? "\u2605" : "\u2606"}
                    </button>
                  )}
                  {msg.saved && (
                    <p className="text-[10px] text-amber-400/80 mt-2 italic">
                      {"\u2605"} Saved \u2014 survives &quot;clear chat&quot;
                    </p>
                  )}
                </>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                Analyzing your chart...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Exhausted CTA — wallet is pooled across ALL the user's chat threads */}
      {isExhausted && (
        <div className="px-4 py-4 bg-slate-900/80 border-t border-slate-800 text-center">
          <p className="text-slate-400 text-sm mb-1">
            You&apos;ve used all {questionLimit} questions across your charts.
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Buy more — added to your wallet, usable on any chart you discuss here.
          </p>
          <button
            onClick={onUpgrade}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2 rounded-lg transition-colors text-sm"
          >
            Buy more questions
          </button>
        </div>
      )}

      {/* Input */}
      {!isExhausted && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about your chart..."
              maxLength={500}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-black font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
