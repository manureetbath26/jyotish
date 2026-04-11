"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  questionsUsed: number;
  questionLimit: number;
  initialMessages: Message[];
  onUpgrade: () => void;
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
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(initialUsed);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-medium text-slate-300">
          Ask about your chart
        </h3>
        <span className="text-xs text-slate-500">
          {isUnlimited ? (
            <span className="text-emerald-400">Unlimited questions</span>
          ) : (
            <>
              <span className="text-amber-400 font-medium">{remaining}</span>
              {" "}question{remaining === 1 ? "" : "s"} remaining
            </>
          )}
        </span>
      </div>

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
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-100"
                  : "bg-slate-800 border border-slate-700 text-slate-300"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="space-y-1 [&_strong]:font-semibold [&_hr]:my-3"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
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

      {/* Exhausted CTA */}
      {isExhausted && (
        <div className="px-4 py-4 bg-slate-900/80 border-t border-slate-800 text-center">
          <p className="text-slate-400 text-sm mb-3">
            You&apos;ve used all {questionLimit} questions in this session.
          </p>
          <button
            onClick={onUpgrade}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2 rounded-lg transition-colors text-sm"
          >
            Get More Questions
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
