"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Play, RotateCcw, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { McpTool, McpContentItem, listMcpTools, callMcpTool } from "@/lib/services/mcp.service";

interface ConsoleMessage {
  id: string;
  type: "call" | "result" | "error" | "system";
  toolName?: string;
  args?: string;
  content?: McpContentItem[];
  text?: string;
  durationMs?: number;
  timestamp: Date;
}

interface Props {
  /** Raw MCP bearer token — must start with mcp_. Null means not configured. */
  activeToken: string | null;
}

/**
 * MCP Tool Console — interactive REPL-style panel for executing MCP tools.
 * Loads available tools from the selected token via tools/list, lets the admin
 * pick a tool and supply JSON arguments, and displays the result inline.
 *
 * @param props - Component props including the active bearer token.
 * @returns The React component.
 */
export default function McpToolConsole({ activeToken }: Props) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [argsJson, setArgsJson] = useState("{}");
  const [executing, setExecuting] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addMessage = (msg: Omit<ConsoleMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
    ]);
  };

  const fetchTools = useCallback(async () => {
    if (!activeToken) return;
    setLoadingTools(true);
    setTools([]);
    setSelectedTool(null);
    try {
      const list = await listMcpTools(activeToken);
      setTools(list);
      addMessage({ type: "system", text: `Connected — ${list.length} tools available.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to list tools";
      addMessage({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setLoadingTools(false);
    }
  }, [activeToken]);

  useEffect(() => {
    if (activeToken) {
      setMessages([]);
      fetchTools();
    } else {
      setTools([]);
      setSelectedTool(null);
    }
  }, [activeToken, fetchTools]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    const defaults: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
      if (schema.type === "string") defaults[key] = "";
      else if (schema.type === "number" || schema.type === "integer") defaults[key] = 0;
      else if (schema.type === "boolean") defaults[key] = false;
      else if (schema.type === "array") defaults[key] = [];
      else defaults[key] = null;
    }
    setArgsJson(JSON.stringify(defaults, null, 2));
  };

  const handleExecute = async () => {
    if (!activeToken || !selectedTool) return;

    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON arguments");
      return;
    }

    addMessage({ type: "call", toolName: selectedTool.name, args: argsJson });
    setExecuting(true);
    const start = Date.now();

    try {
      const content = await callMcpTool(activeToken, selectedTool.name, parsedArgs);
      addMessage({ type: "result", toolName: selectedTool.name, content, durationMs: Date.now() - start });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tool execution failed";
      addMessage({ type: "error", text: msg, toolName: selectedTool.name, durationMs: Date.now() - start });
    } finally {
      setExecuting(false);
    }
  };

  const resultText = (content: McpContentItem[]): string => {
    const texts = content.filter((c) => c.type === "text" && c.text).map((c) => c.text!);
    if (texts.length === 0) return JSON.stringify(content, null, 2);
    try { return JSON.stringify(JSON.parse(texts.join("")), null, 2); }
    catch { return texts.join("\n"); }
  };

  if (!activeToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-3">
        <Terminal className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-bold text-muted-foreground">No token loaded</p>
        <p className="text-[10px] text-muted-foreground font-sans max-w-xs">
          Create or select a token in the Token Manager tab, then click &quot;Load into Console&quot; to start.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 text-left">
      {/* Tool selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tool list */}
        <div className="lg:col-span-4 border border-border/80 rounded-2xl bg-card/65 backdrop-blur-md overflow-hidden flex flex-col hover-lift transition-all duration-300">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tools Catalog</span>
            <button onClick={fetchTools} disabled={loadingTools} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 hover:bg-secondary rounded-md border border-border bg-card">
              {loadingTools ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="overflow-y-auto max-h-64">
            {tools.length === 0 && !loadingTools && (
              <p className="text-[10px] text-muted-foreground px-3 py-5 font-sans text-center">No tools loaded</p>
            )}
            {tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => handleSelectTool(tool)}
                className={`w-full text-left px-4 py-2.5 text-[10px] font-mono border-b border-border/40 last:border-b-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTool?.name === tool.name
                    ? "bg-primary/10 text-primary font-bold border-l-2 border-l-primary"
                    : "text-foreground hover:bg-secondary/40"
                }`}
              >
                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Args + execute */}
        <div className="lg:col-span-8 border border-border/80 rounded-2xl bg-card/65 backdrop-blur-md overflow-hidden flex flex-col hover-lift transition-all duration-300">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[10px] font-bold text-foreground font-mono">
              {selectedTool ? selectedTool.name : "Select a tool"}
            </span>
            {selectedTool && (
              <span className="text-[9px] text-muted-foreground font-sans truncate max-w-sm">{selectedTool.description}</span>
            )}
          </div>
          <textarea
            value={argsJson}
            onChange={(e) => setArgsJson(e.target.value)}
            disabled={!selectedTool}
            className="flex-1 resize-none bg-background text-foreground font-mono text-[11px] p-3.5 outline-hidden min-h-[140px] disabled:opacity-40"
            placeholder='{\n  "param": "value"\n}'
            spellCheck={false}
          />
          <div className="px-4 py-2.5 border-t border-border bg-muted/5 flex justify-end">
            <Button
              onClick={handleExecute}
              disabled={!selectedTool || executing}
              className="h-8 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer btn-primary px-3 rounded-lg"
            >
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Execute Tool</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Output console */}
      <div className="flex-1 border border-border rounded-xl bg-[#0a0a0a] dark:bg-black/60 overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-border/50 bg-muted/5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">mcp-console</span>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="ml-auto text-[9px] text-muted-foreground hover:text-foreground">clear</button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3 font-mono text-[11px]">
          {messages.length === 0 && (
            <p className="text-muted-foreground/40 text-[10px]">$ Ready — select a tool and press Execute</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "system" && (
                <p className="text-blue-400/80">ℹ {msg.text}</p>
              )}
              {msg.type === "call" && (
                <div className="space-y-1">
                  <p className="text-amber-400">$ {msg.toolName}</p>
                  <pre className="text-muted-foreground/60 text-[10px] pl-2 whitespace-pre-wrap break-all">{msg.args}</pre>
                </div>
              )}
              {msg.type === "result" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 text-[10px]">{msg.toolName} ({msg.durationMs}ms)</span>
                  </div>
                  <pre className="text-green-300/80 pl-4 text-[10px] whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    {resultText(msg.content ?? [])}
                  </pre>
                </div>
              )}
              {msg.type === "error" && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    {msg.toolName && <span className="text-red-400/70 text-[10px]">{msg.toolName} </span>}
                    <span className="text-red-400">{msg.text}</span>
                    {msg.durationMs !== undefined && <span className="text-muted-foreground/40 text-[9px] ml-2">({msg.durationMs}ms)</span>}
                  </div>
                </div>
              )}
              <p className="text-muted-foreground/20 text-[8px]">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
