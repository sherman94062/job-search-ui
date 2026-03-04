"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, JobListing, UsageInfo, ApiMessage } from "@/lib/types";
import ChatPanel from "@/components/ChatPanel";
import JobsPanel from "@/components/JobsPanel";

export default function Home() {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [apiMessages,     setApiMessages]     = useState<ApiMessage[]>([]);
  const [jobs,            setJobs]            = useState<JobListing[]>([]);
  const [isStreaming,     setIsStreaming]      = useState(false);
  const [currentTool,     setCurrentTool]     = useState<string | null>(null);
  const [usage,           setUsage]           = useState<UsageInfo | null>(null);
  const [input,           setInput]           = useState("");

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userApiMsg: ApiMessage = { role: "user", content: trimmed };
    const newApiMessages = [...apiMessages, userApiMsg];

    setDisplayMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setApiMessages(newApiMessages);
    setInput("");
    setIsStreaming(true);
    setCurrentTool(null);
    setUsage(null);

    let assistantContent = "";
    let assistantAdded   = false;

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: newApiMessages }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Unknown error");
        setDisplayMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errText}`, streaming: false },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventType = "";
          let dataStr   = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }

          if (!eventType || !dataStr) continue;

          let data: Record<string, unknown>;
          try { data = JSON.parse(dataStr) as Record<string, unknown>; }
          catch { continue; }

          switch (eventType) {
            case "text": {
              const delta = String(data["delta"] ?? "");
              assistantContent += delta;
              if (!assistantAdded) {
                setDisplayMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: assistantContent, streaming: true },
                ]);
                assistantAdded = true;
              } else {
                setDisplayMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              setCurrentTool(null);
              break;
            }

            case "tool_call": {
              const tool = String(data["tool"] ?? "");
              setCurrentTool(tool);
              break;
            }

            case "job_results": {
              const incoming = data["jobs"];
              if (Array.isArray(incoming)) {
                setJobs(incoming as JobListing[]);
              }
              break;
            }

            case "done": {
              const usageData = data["usage"] as { input_tokens: number; output_tokens: number } | undefined;
              const cost      = Number(data["cost"] ?? 0);
              const updatedMsgs = data["messages"] as ApiMessage[] | undefined;

              if (usageData) {
                setUsage({ input: usageData.input_tokens, output: usageData.output_tokens, cost });
              }
              if (updatedMsgs) setApiMessages(updatedMsgs);

              setCurrentTool(null);
              setIsStreaming(false);
              setDisplayMessages((prev) => {
                if (!prev.length || prev[prev.length - 1].role !== "assistant") return prev;
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
                return updated;
              });
              break;
            }

            case "error": {
              const message = String(data["message"] ?? "Unknown error");
              setCurrentTool(null);
              setIsStreaming(false);
              if (!assistantAdded) {
                setDisplayMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `Error: ${message}`, streaming: false },
                ]);
              } else {
                setDisplayMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    streaming: false,
                    content: assistantContent + `\n\nError: ${message}`,
                  };
                  return updated;
                });
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      setCurrentTool(null);
      setIsStreaming(false);
      const message = err instanceof Error ? err.message : String(err);
      setDisplayMessages((prev) => [...prev, { role: "assistant", content: `Error: ${message}`, streaming: false }]);
    }
  }, [apiMessages, isStreaming]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleDetails = useCallback((jobId: number) => {
    sendMessage(`Tell me more about job #${jobId}`);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-panel border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
            J
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-none">Job Search Agent</h1>
            <p className="text-[11px] text-text-muted mt-0.5">Powered by Claude · Remotive</p>
          </div>
        </div>
        <div className="text-[11px] text-text-muted hidden sm:block">
          Defaults: Forward Deployed Engineer · Austin, TX · Full-time
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat — 55% */}
        <div className="w-[55%] flex flex-col overflow-hidden">
          <ChatPanel
            messages={displayMessages}
            isStreaming={isStreaming}
            currentTool={currentTool}
            usage={usage}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
          />
        </div>

        {/* Jobs — 45% */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          <JobsPanel jobs={jobs} onDetails={handleDetails} />
        </div>
      </div>
    </div>
  );
}
