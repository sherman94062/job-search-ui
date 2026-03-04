"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, UsageInfo } from "@/lib/types";
import Message from "./Message";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentTool: string | null;
  usage: UsageInfo | null;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function ChatPanel({
  messages,
  isStreaming,
  currentTool,
  usage,
  input,
  onInputChange,
  onSend,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTool]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const costStr = usage
    ? usage.cost < 0.001
      ? "< $0.001"
      : `$${usage.cost.toFixed(4)}`
    : null;

  return (
    <div className="flex flex-col h-full bg-panel">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-4xl mb-4 opacity-40">💼</div>
            <h3 className="text-text-primary font-semibold mb-2">Job Search Agent</h3>
            <p className="text-text-muted text-sm mb-4">
              Find remote jobs powered by Claude + Remotive.
            </p>
            <div className="space-y-1.5 text-xs text-text-muted">
              {[
                "find me jobs  (uses defaults)",
                "senior ML engineer roles in San Francisco",
                "typescript AI agent contract jobs",
                "show me details for job #1234",
              ].map((ex) => (
                <div key={ex} className="bg-card border border-border rounded-lg px-3 py-1.5 font-mono">
                  {ex}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <Message key={idx} message={msg} />
            ))}

            {/* Tool call indicator */}
            {currentTool && (
              <div className="flex items-center gap-2 mb-4 text-xs text-text-muted">
                <div className="w-4 h-4 border-2 border-accent/60 border-t-transparent rounded-full animate-spin" />
                <span>Calling <span className="text-accent-light font-mono">{currentTool}</span>…</span>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Token / cost footer */}
      {usage && (
        <div className="shrink-0 px-4 pb-1">
          <p className="text-[11px] text-text-muted">
            ↑{usage.input.toLocaleString()} ↓{usage.output.toLocaleString()} tokens · {costStr}
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border">
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 focus-within:border-accent/60 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              // Auto-grow (max ~5 lines)
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to find jobs…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-muted outline-none min-h-[24px] max-h-[120px] overflow-y-auto leading-6 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
            aria-label="Send"
          >
            {isStreaming ? (
              <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 ml-1">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
