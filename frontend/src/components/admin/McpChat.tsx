"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Key,
  Send,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** A single message in the UI conversation. */
interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolEvent[];
  streaming: boolean;
}

/** Tracks the lifecycle of a single tool call inside an assistant message. */
interface ToolEvent {
  name: string;
  status: "calling" | "done";
  ms?: number;
}

/** NDJSON event emitted by /api/chat. */
interface ChatEvent {
  type: "text" | "tool_call" | "error" | "done";
  delta?: string;
  name?: string;
  status?: "calling" | "done";
  ms?: number;
  message?: string;
}

const SUGGESTED_PROMPTS = [
  "List all active deployments",
  "Any active alerts right now?",
  "Platform health summary",
  "Fraud risk summary",
  "Any suspicious or error logs recently?",
  "Any failed background jobs right now?",
];

interface Props {
  /** Active MCP bearer token loaded in the token manager. */
  activeToken: string | null;
}

/**
 * Natural-language chat interface for the MCP admin console.
 * Sends messages to /api/chat which runs an agentic loop against the local
 * llama.cpp LLM + MCP tools, then streams NDJSON events back.
 *
 * @param props - Component props.
 * @returns The chat UI.
 */
export default function McpChat({ activeToken }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeToken || streaming) return;

      const userMsg: Message = { role: "user", content: text.trim(), toolCalls: [], streaming: false };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);

      // Placeholder assistant message that we'll fill in via stream
      const assistantIdx = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", toolCalls: [], streaming: true },
      ]);

      try {
        // Build history for the API (exclude the streaming placeholder)
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mcpToken: activeToken }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Chat API error ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const updateAssistant = (updater: (prev: Message) => Message) => {
          setMessages((prev) =>
            prev.map((m, i) => (i === assistantIdx ? updater(m) : m)),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let event: ChatEvent;
            try {
              event = JSON.parse(trimmed) as ChatEvent;
            } catch {
              continue;
            }

            if (event.type === "text" && event.delta) {
              updateAssistant((m) => ({ ...m, content: m.content + event.delta }));
            } else if (event.type === "tool_call" && event.name) {
              updateAssistant((m) => {
                const existing = m.toolCalls.findIndex((t) => t.name === event.name && t.status === "calling");
                if (event.status === "calling") {
                  return { ...m, toolCalls: [...m.toolCalls, { name: event.name!, status: "calling" }] };
                }
                if (event.status === "done" && existing !== -1) {
                  const updated = m.toolCalls.map((t, i) =>
                    i === existing ? { ...t, status: "done" as const, ms: event.ms } : t,
                  );
                  return { ...m, toolCalls: updated };
                }
                return m;
              });
            } else if (event.type === "error" && event.message) {
              updateAssistant((m) => ({ ...m, content: `⚠ ${event.message}` }));
            } else if (event.type === "done") {
              updateAssistant((m) => ({ ...m, streaming: false }));
            }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unexpected error";
        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIdx ? { ...m, content: `⚠ ${errMsg}`, streaming: false } : m,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [activeToken, messages, streaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  if (!activeToken) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-[10px] text-amber-500 font-sans">
        <Key className="w-3.5 h-3.5 shrink-0" />
        Go to the <strong className="font-bold">Token Manager</strong> tab, load a token with{" "}
        <code className="font-mono">observability:read</code>,{" "}
        <code className="font-mono">security:read</code>, and{" "}
        <code className="font-mono">admin:read</code> scopes to start chatting.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Clear button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setMessages([])}
          disabled={streaming || messages.length === 0}
          className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Message list / suggested prompts */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <p className="text-[10px] text-muted-foreground font-sans">
              Ask anything about your platform — the agent will call the right tools automatically.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="text-[10px] px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-card hover:border-primary/30 transition-all text-foreground font-sans cursor-pointer hover-lift"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[75%] px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground text-[11px] font-sans shadow-xs hover-lift transition-all duration-300 text-left">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[85%] space-y-2 text-left">
                  {/* Tool call pills */}
                  {msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {msg.toolCalls.map((tc, ti) => (
                        <span
                          key={ti}
                          className={`inline-flex items-center gap-1 text-[8px] px-2 py-1 rounded-full border font-mono transition-colors ${
                            tc.status === "calling"
                              ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-500"
                              : "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-500"
                          }`}
                        >
                          {tc.status === "calling" ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          )}
                          <Wrench className="w-2 h-2 opacity-60" />
                          {tc.name}
                          {tc.ms !== undefined && (
                            <span className="opacity-60 ml-0.5">{tc.ms}ms</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Thinking indicator (tools called but no text yet) */}
                  {msg.streaming && msg.content === "" && msg.toolCalls.every((t) => t.status === "done") && (
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  )}

                  {/* Streaming spinner (no tools, waiting for first token) */}
                  {msg.streaming && msg.content === "" && msg.toolCalls.length === 0 && (
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Calling tools…</span>
                    </div>
                  )}

                  {/* Message text */}
                  {msg.content && (
                    <div
                      className={`px-3 py-2.5 rounded-xl border border-border bg-card text-[11px] font-sans text-foreground whitespace-pre-wrap leading-relaxed ${
                        msg.content.startsWith("⚠") ? "border-red-500/30 text-red-500" : ""
                      }`}
                    >
                      {msg.content}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-foreground/60 ml-0.5 animate-pulse rounded-sm" />
                      )}
                    </div>
                  )}

                  {/* Error indicator */}
                  {!msg.streaming && msg.content.startsWith("⚠") && (
                    <div className="flex items-center gap-1 text-[8px] text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      LLM server may be starting up — try again in a moment
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your platform… (Enter to send, Shift+Enter for newline)"
            disabled={streaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-secondary px-3 py-2 text-[11px] font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 min-h-[36px] max-h-[120px] overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <Button
            onClick={() => void sendMessage(input)}
            disabled={streaming || !input.trim()}
            className="h-9 w-9 p-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shrink-0"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[8px] text-muted-foreground font-sans mt-1.5 ml-1">
          Powered by Qwen2.5-1.5B via llama.cpp · Tool calls run against your MCP server
        </p>
      </div>
    </div>
  );
}
