"use client";

import React from "react";
import Link from "next/link";
import { Play, Clock, CheckCircle2, Cpu, FileCode, Sparkles, AlertTriangle, RotateCcw, Upload, Lock, Send, Square, MessageSquare, Code2, Zap, Bot, User } from "lucide-react";
import { usePrediction } from "@/hooks/use-prediction";
import { type Model, ModelType } from "@/types";
import { PredictionHistoryTable } from "./PredictionHistoryTable";

interface ModelPlaygroundProps {
  model: Model;
  selectedVersionNumber?: number;
  isAuthenticated?: boolean;
}

/**
 * ModelPlayground component rendering prediction JSON inputs,
 * execution handlers, performance metrics, and prediction histories.
 */
export default function ModelPlayground({ model, selectedVersionNumber, isAuthenticated = true }: ModelPlaygroundProps) {
  const {
    activeDeployment,
    isRunning,
    isLlm,
    isStreaming,
    streamingText,
    tokenStats,
    payload,
    setPayload,
    result,
    isValidJson,
    jsonError,
    lastLatency,
    lastConfidence,
    lastMemory,
    httpStatus,
    history,
    handleRun,
    handleStopStream,
    handleFormat,
    handleReset,
    handleClearHistory,
    loadHistoryItem,
  } = usePrediction(model, selectedVersionNumber);

  const [selectedImagePreview, setSelectedImagePreview] = React.useState<string | null>(null);
  const [visionMode, setVisionMode] = React.useState<"visual" | "json">("visual");

  // LLM Chat Mode state
  const [llmMode, setLlmMode] = React.useState<"chat" | "json">("chat");
  const [systemPrompt, setSystemPrompt] = React.useState("You are a helpful assistant.");
  const [userMessage, setUserMessage] = React.useState("");
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);
  const llmOutputRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (model.type === ModelType.VISION) {
      try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed.image === "string" && parsed.image.startsWith("data:image")) {
          setSelectedImagePreview(parsed.image);
        } else if (parsed && typeof parsed.image === "string" && parsed.image !== "base64_encoded_image_string") {
          setSelectedImagePreview(`data:image/png;base64,${parsed.image}`);
        } else {
          setSelectedImagePreview(null);
        }
      } catch (e) {
        setSelectedImagePreview(null);
      }
    }
  }, [payload, model.type]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      setPayload(JSON.stringify({ image: base64Str }, null, 2));
    };
    reader.readAsDataURL(file);
  };

  // Derive values for Diffusion input
  let diffusionPrompt = "";
  let diffusionSteps = 10;
  let diffusionGuidance = 7.5;
  if (model.type === ModelType.DIFFUSION) {
    try {
      const parsed = JSON.parse(payload);
      diffusionPrompt = parsed.prompt || "";
      diffusionSteps = parsed.num_inference_steps ?? 10;
      diffusionGuidance = parsed.guidance_scale ?? 7.5;
    } catch (e) {
      // fallback
    }
  }

  const handleDiffusionPromptChange = (val: string) => {
    setPayload(JSON.stringify({ prompt: val, num_inference_steps: diffusionSteps, guidance_scale: diffusionGuidance }, null, 2));
  };
  const handleDiffusionStepsChange = (val: number) => {
    setPayload(JSON.stringify({ prompt: diffusionPrompt, num_inference_steps: val, guidance_scale: diffusionGuidance }, null, 2));
  };
  const handleDiffusionGuidanceChange = (val: number) => {
    setPayload(JSON.stringify({ prompt: diffusionPrompt, num_inference_steps: diffusionSteps, guidance_scale: val }, null, 2));
  };

  let base64Image: string | null = null;
  if (model.type === ModelType.DIFFUSION && result) {
    try {
      const parsed = JSON.parse(result);
      if (parsed && typeof parsed.image === "string") {
        base64Image = parsed.image;
      }
    } catch (e) {
      // ignore
    }
  }

  // Auto-scroll LLM output during streaming
  React.useEffect(() => {
    if (isStreaming && llmOutputRef.current) {
      llmOutputRef.current.scrollTop = llmOutputRef.current.scrollHeight;
    }
  }, [streamingText, isStreaming]);

  // Build JSON payload from chat fields for LLM models
  const handleLlmSend = () => {
    if (!userMessage.trim()) return;
    const chatPayload = JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage.trim() },
      ],
      stream: true,
    }, null, 2);
    setPayload(chatPayload);
    // Pass payload directly to avoid React state batching delay
    handleRun(chatPayload);
  };

  // Handle Enter key in user message input
  const handleLlmKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleLlmSend();
    }
  };

  const lineNumbers = React.useMemo(() => {
    const lines = payload.split("\n");
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  }, [payload]);

  return (
    <div className="space-y-6 font-mono text-xs text-foreground animate-fade-in">
      {/* Playground Header status banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-card border border-border rounded-xl gap-4 shadow-sm select-none font-sans">
        <div className="space-y-1">
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Sandbox Playground
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Send raw prediction payloads to the container execution engine.
          </p>
        </div>

        <div>
          {activeDeployment ? (
            <span className="badge badge-success text-[10px] font-bold py-1.5 px-3 rounded-lg font-sans">
              <span className="badge-dot animate-pulse"></span>
              LIVE: {activeDeployment.url || `Port ${activeDeployment.port}`}
            </span>
          ) : (
            <span className="badge badge-warning text-[10px] font-bold py-1.5 px-3 rounded-lg font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
              NO ACTIVE DEPLOYMENT (Queries will fail)
            </span>
          )}
        </div>
      </div>

      {/* Editor & Output Container */}
      <div className="relative">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 ${!isAuthenticated ? "blur-[2px] pointer-events-none select-none opacity-50" : ""}`}>
          {/* Payload Input */}
          <div className="border border-border bg-card rounded-xl overflow-hidden flex flex-col h-100 shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background select-none font-sans">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <FileCode className="w-4 h-4 text-primary" />
                {isLlm ? "Chat Input" : model.type === ModelType.DIFFUSION ? "Diffusion Prompt Config" : "Payload JSON"}
              </div>
              <div className="flex items-center gap-3">
                {isLlm && (
                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background mr-1">
                    <button
                      onClick={() => setLlmMode("chat")}
                      className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1 ${
                        llmMode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                    <button
                      onClick={() => setLlmMode("json")}
                      className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1 ${
                        llmMode === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Code2 className="w-3 h-3" /> JSON
                    </button>
                  </div>
                )}
                {model.type === ModelType.VISION && (
                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background mr-1">
                    <button
                      onClick={() => setVisionMode("visual")}
                      className={`text-[9px] font-bold px-2 py-1 transition-colors cursor-pointer ${
                        visionMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      onClick={() => setVisionMode("json")}
                      className={`text-[9px] font-bold px-2 py-1 transition-colors cursor-pointer ${
                        visionMode === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                )}
                {!isLlm && model.type !== ModelType.DIFFUSION && (
                  <button
                    onClick={handleFormat}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-bold px-2 py-1 rounded bg-background border border-border cursor-pointer transition-colors"
                    disabled={!isValidJson}
                  >
                    Format
                  </button>
                )}
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                  {isLlm ? (llmMode === "chat" ? "CHAT COMPLETIONS" : "APPLICATION/JSON") : model.type === ModelType.DIFFUSION ? "Text-to-Image" : model.type === ModelType.VISION ? "Image-to-Class" : "APPLICATION/JSON"}
                </span>
              </div>
            </div>
            <div className="relative flex-1 flex flex-col bg-black/35 overflow-hidden">
              {/* LLM Chat Mode Input */}
              {isLlm && llmMode === "chat" ? (
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {/* System Prompt (collapsible) */}
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans cursor-pointer hover:text-foreground transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      System Prompt
                      <span className="text-[8px] ml-1 opacity-60">{showSystemPrompt ? "▼" : "▶"}</span>
                    </button>
                    {showSystemPrompt && (
                      <textarea
                        className="w-full bg-slate-950/70 text-slate-200 border border-border/60 rounded-lg font-sans text-[11px] p-3 h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed transition-all duration-200"
                        placeholder="You are a helpful assistant."
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        disabled={isRunning}
                      />
                    )}
                  </div>

                  {/* User Message Input */}
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
                      <User className="w-3.5 h-3.5" />
                      Your Message
                    </label>
                    <textarea
                      className="w-full flex-1 bg-slate-950/70 text-slate-100 border border-border/60 rounded-lg font-sans text-[12px] p-3 min-h-30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed placeholder:text-slate-600"
                      placeholder="Type your message here... (Enter to send, Shift+Enter for newline)"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyDown={handleLlmKeyDown}
                      disabled={isRunning}
                    />
                  </div>

                  {/* Quick send hint */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground/50 font-sans">
                      Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[8px] border border-slate-700">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[8px] border border-slate-700">Shift+Enter</kbd> for newline
                    </span>
                  </div>
                </div>
              ) : model.type === ModelType.DIFFUSION ? (
                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-sans">Prompt Input</label>
                    <textarea
                      className="w-full bg-slate-950 text-slate-100 border border-border/80 rounded-xl font-sans text-xs p-4 h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
                      placeholder="e.g. A cute dog coding in python"
                      value={diffusionPrompt}
                      onChange={(e) => handleDiffusionPromptChange(e.target.value)}
                      disabled={isRunning}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-sans">Inference Steps</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="h-10 px-3 bg-slate-950 text-slate-100 border border-border/80 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
                        value={diffusionSteps}
                        onChange={(e) => handleDiffusionStepsChange(parseInt(e.target.value) || 10)}
                        disabled={isRunning}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-sans">Guidance Scale</label>
                      <input
                        type="number"
                        step={0.1}
                        min={1}
                        max={20}
                        className="h-10 px-3 bg-slate-950 text-slate-100 border border-border/80 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
                        value={diffusionGuidance}
                        onChange={(e) => handleDiffusionGuidanceChange(parseFloat(e.target.value) || 7.5)}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                </div>
              ) : model.type === ModelType.VISION && visionMode === "visual" ? (
                <div className="flex-1 p-5 flex flex-col justify-center items-center overflow-y-auto">
                  {selectedImagePreview ? (
                    <div className="relative group max-w-full flex flex-col items-center">
                      <img
                        src={selectedImagePreview}
                        alt="Selected preview"
                        className="max-h-55 object-contain rounded-lg border border-border/85 shadow-md"
                      />
                      <button
                        onClick={() => setPayload(JSON.stringify({ image: "base64_encoded_image_string" }, null, 2))}
                        className="mt-3 text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded bg-red-950/20 border border-red-500/25 transition-colors cursor-pointer"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer w-full max-w-70">
                      <Upload className="w-8 h-8 text-muted-foreground/60 mb-2" />
                      <span className="font-bold text-[11px] text-foreground">Click to upload image</span>
                      <span className="text-[9px] text-muted-foreground mt-1">Supports PNG, JPG, JPEG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isRunning}
                      />
                    </label>
                  )}
                  <div className="mt-4 w-full border-t border-border/30 pt-3 flex justify-center">
                    <span className="text-[9px] text-muted-foreground font-bold tracking-wide uppercase">
                      Auto-converts to Base64 in JSON request
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex-1 flex bg-[#f8f9fa] dark:bg-[#0c0d12] border-t border-border/50 overflow-hidden h-full">
                  {/* Line Numbers Column */}
                  <div
                    className="w-10 select-none text-right pr-2 text-muted-foreground/30 dark:text-zinc-650 border-r border-border/40 py-4 bg-slate-100/30 dark:bg-zinc-900/10 overflow-hidden font-mono text-[11px] leading-relaxed flex flex-col"
                  >
                    {lineNumbers.map((num) => (
                      <div key={num}>{num}</div>
                    ))}
                  </div>
                  {/* Textarea */}
                  <textarea
                    className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] p-4 pl-3 overflow-auto resize-none focus:outline-none leading-relaxed border-0 h-full w-full outline-none focus:ring-0"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    spellCheck={false}
                  />
                  {!isValidJson && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-950/90 border-t border-red-500/20 p-2.5 text-[10px] font-mono text-red-400 flex items-center gap-2 z-10 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span className="line-clamp-1">{jsonError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Response Output */}
          <div className="border border-border bg-card rounded-xl overflow-hidden flex flex-col h-100 shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background select-none font-sans">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                {isLlm ? <Bot className="w-4 h-4 text-primary" /> : <Sparkles className="w-4 h-4 text-primary animate-pulse" />}
                {isLlm ? "Assistant Response" : "Response Output"}
              </div>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary animate-pulse">
                    <Zap className="w-3 h-3" />
                    Streaming...
                  </span>
                )}
                {httpStatus && (
                  <div
                    className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider ${
                      httpStatus.startsWith("200") ? "text-emerald-600 dark:text-emerald-400" : "text-red-650 dark:text-red-400"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        httpStatus.startsWith("200") ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                      }`}
                    ></div>
                    {httpStatus}
                  </div>
                )}
              </div>
            </div>
            <div ref={llmOutputRef} className={`flex-1 ${isLlm ? 'bg-[#fafbfc] dark:bg-[#0a0b10]' : 'bg-[#f8f9fa] dark:bg-[#0c0d12]'} text-emerald-650 dark:text-emerald-400 font-mono text-[11px] p-0 overflow-auto leading-relaxed border-t border-border/50 flex flex-col ${isLlm && !result ? 'justify-center' : ''}`}>
              {base64Image ? (
                <div className="flex flex-col items-center justify-center p-2 bg-slate-900 border border-border/80 rounded-xl max-w-full m-4 self-center">
                  <img
                    src={`data:image/png;base64,${base64Image}`}
                    alt="Generated diffusion output"
                    className="max-h-70 object-contain rounded-lg shadow-md"
                  />
                  <span className="text-[9px] text-muted-foreground mt-2 font-sans font-semibold">Generated Image Output</span>
                </div>
              ) : isLlm && (result || isStreaming) ? (
                /* LLM streaming output with chat-like appearance */
                <div className="p-5 h-full">
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground font-sans mb-2 uppercase tracking-wider">Assistant</p>
                      <div className="text-[13px] text-foreground font-sans leading-relaxed whitespace-pre-wrap wrap-break-word">
                        {result}
                        {isStreaming && (
                          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-text-bottom animate-pulse" />
                        )}
                      </div>
                      {/* Token stats footer */}
                      {!isStreaming && tokenStats && (
                        <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-4 text-[10px] text-muted-foreground font-sans">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {tokenStats.tokensPerSec} tokens/sec
                          </span>
                          <span>{tokenStats.completionTokens} tokens generated</span>
                          {tokenStats.promptTokens > 0 && (
                            <span>{tokenStats.promptTokens} prompt tokens</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : result ? (
                <pre className="whitespace-pre-wrap p-4 text-left self-start h-full w-full">{result}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/45 gap-2 select-none font-mono">
                  {isLlm ? (
                    <>
                      <Bot className="w-8 h-8 opacity-45" />
                      <p className="text-[11px] font-sans">Type a message and press Enter to start chatting.</p>
                    </>
                  ) : (
                    <>
                      <TerminalIcon className="w-8 h-8 opacity-45" />
                      <p className="text-[11px] font-sans">Run a query payload to display inference telemetry.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lock Overlay for Guests */}
        {!isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 bg-background/30 backdrop-blur-[2px] transition-all duration-300">
            <div className="bg-card/95 border border-border/80 rounded-2xl p-8 shadow-xl max-w-sm space-y-5 animate-fade-in backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-bounce font-sans">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-2 font-sans">
                <h3 className="text-sm font-bold text-foreground">Interactive Playground Locked</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign in or register a free account to execute live predictions and test sandbox models.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2 select-none font-sans">
                <Link
                  href="/login"
                  className="btn-outline px-4 py-2 text-xs font-bold"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-4 py-2 text-xs font-bold"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions Row */}
      <div className="flex justify-end gap-3 select-none font-sans">
        <button 
          onClick={handleReset} 
          className="btn-outline flex items-center gap-1.5 font-bold" 
          title="Reset to template"
          disabled={!isAuthenticated}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Template
        </button>
        {isLlm && llmMode === "chat" ? (
          isStreaming ? (
            <button
              onClick={handleStopStream}
              className="btn-primary flex items-center gap-1.5 font-bold bg-red-600 hover:bg-red-700 border-red-600"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop Generating
            </button>
          ) : (
            <button
              onClick={handleLlmSend}
              className="btn-primary flex items-center gap-1.5 font-bold"
              disabled={!isAuthenticated || isRunning || !userMessage.trim()}
            >
              <Send className="w-3.5 h-3.5" /> {isRunning ? "Generating..." : "Send Message"}
            </button>
          )
        ) : (
          isStreaming ? (
            <button
              onClick={handleStopStream}
              className="btn-primary flex items-center gap-1.5 font-bold bg-red-600 hover:bg-red-700 border-red-600"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={() => handleRun()}
              className="btn-primary flex items-center gap-1.5 font-bold"
              disabled={!isAuthenticated || isRunning || !isValidJson}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> {isRunning ? "Executing query..." : "Run Inference"}
            </button>
          )
        )}
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none font-sans">
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Response Latency</p>
            <p className="text-xl font-extrabold text-foreground">{lastLatency}</p>
          </div>
        </div>
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 border border-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            {isLlm ? <Zap className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">{isLlm ? "Generation Speed" : "Confidence Score"}</p>
            <p className="text-xl font-extrabold text-foreground">{isLlm && tokenStats ? `${tokenStats.tokensPerSec} tok/s` : lastConfidence}</p>
          </div>
        </div>
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-amber-50 text-amber-600 border border-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Container Memory</p>
            <p className="text-xl font-extrabold text-foreground">{lastMemory}</p>
          </div>
        </div>
      </div>

      <PredictionHistoryTable
        history={history}
        onClear={handleClearHistory}
        onReplay={loadHistoryItem}
      />
    </div>
  );
}

function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
