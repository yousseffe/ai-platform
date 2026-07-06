"use client";

import React from "react";
import Link from "next/link";
import { Play, Clock, CheckCircle2, Cpu, FileCode, Sparkles, AlertTriangle, RotateCcw, Upload, Lock, Send, Square, MessageSquare, Code2, Zap, Bot, User, Sliders } from "lucide-react";
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
      let preview: string | null = null;
      try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed.image === "string" && parsed.image.startsWith("data:image")) {
          preview = parsed.image;
        } else if (parsed && typeof parsed.image === "string" && parsed.image !== "base64_encoded_image_string") {
          preview = `data:image/png;base64,${parsed.image}`;
        }
      } catch (e) {
        // ignore
      }
      const timer = setTimeout(() => {
        setSelectedImagePreview(preview);
      }, 0);
      return () => clearTimeout(timer);
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
    <div className="space-y-6 font-sans text-xs text-foreground animate-fade-in">
      {/* Playground Header status banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-gradient-to-r from-background via-card/50 to-background border border-border/80 rounded-2xl gap-4 shadow-sm select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.75 rounded-md font-bold uppercase tracking-wider">
              Sandbox Playground
            </span>
            <span className="text-[10px] bg-secondary text-secondary-foreground border border-border/85 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Interactive
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Send raw prediction payloads to the container execution engine. Adjust features and monitor telemetry.
          </p>
        </div>

        <div>
          {activeDeployment ? (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                LIVE: {activeDeployment.url || `Port ${activeDeployment.port}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                NO ACTIVE DEPLOYMENT (Queries will fail)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Editor & Output Container */}
      <div className="relative">
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-355 ${!isAuthenticated ? "blur-[3.5px] pointer-events-none select-none opacity-40" : ""}`}>
          
          {/* LEFT: Payload Inputs & Control Actions (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="border border-border/80 bg-card/70 dark:bg-zinc-950/40 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-md premium-card p-0 transition-all hover:border-border/100">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/15 select-none">
                <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                  <FileCode className="w-4 h-4 text-primary" />
                  {isLlm ? "Chat Configuration" : model.type === ModelType.DIFFUSION ? "Diffusion Parameters" : "Input Payload (JSON)"}
                </div>
                <div className="flex items-center gap-2">
                  {isLlm && (
                    <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background mr-1">
                      <button
                        onClick={() => setLlmMode("chat")}
                        className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1 ${
                          llmMode === "chat" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" /> Chat
                      </button>
                      <button
                        onClick={() => setLlmMode("json")}
                        className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1 ${
                          llmMode === "json" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
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
                        className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer ${
                          visionMode === "visual" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Visual
                      </button>
                      <button
                        onClick={() => setVisionMode("json")}
                        className={`text-[9px] font-bold px-2.5 py-1 transition-colors cursor-pointer ${
                          visionMode === "json" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        JSON
                      </button>
                    </div>
                  )}
                  {!isLlm && model.type !== ModelType.DIFFUSION && (
                    <button
                      onClick={handleFormat}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-bold px-2.5 py-1 rounded-lg bg-background border border-border cursor-pointer transition-all hover-lift active-shrink"
                      disabled={!isValidJson}
                    >
                      Format
                    </button>
                  )}
                </div>
              </div>
              <div className="relative flex-1 flex flex-col bg-background/20 dark:bg-zinc-950/20 overflow-hidden">
                {/* LLM Chat Mode Input */}
                {isLlm && llmMode === "chat" ? (
                  <div className="flex-1 p-4.5 space-y-4 overflow-y-auto">
                    {/* System Prompt (collapsible) */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                        className="flex items-center gap-1.5 text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        System Instruction
                        <span className="text-[8px] ml-1 opacity-65">{showSystemPrompt ? "▼" : "▶"}</span>
                      </button>
                      {showSystemPrompt && (
                        <textarea
                          className="w-full bg-[#0a0b0e] text-zinc-200 border border-border/80 rounded-xl font-mono text-[11px] p-3.5 h-20 focus:outline-none focus:ring-2 focus:ring-primary/45 resize-none leading-relaxed transition-all duration-200"
                          placeholder="You are a helpful assistant."
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          disabled={isRunning}
                        />
                      )}
                    </div>

                    {/* User Message Input */}
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="flex items-center gap-1.5 text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Prompt Input
                      </label>
                      <textarea
                        className="w-full flex-1 bg-[#0a0b0e] text-zinc-100 border border-border/80 rounded-xl font-sans text-xs p-3.5 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-primary/45 resize-none leading-relaxed placeholder:text-zinc-500"
                        placeholder="Type your prompt message here... (Enter to send, Shift+Enter for newline)"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={handleLlmKeyDown}
                        disabled={isRunning}
                      />
                    </div>

                    {/* Quick send hint */}
                    <div className="flex items-center justify-between select-none pt-1">
                      <span className="text-[9px] text-muted-foreground/60">
                        Press <kbd className="px-1.5 py-0.5 bg-secondary text-[8px] border border-border rounded font-mono">Enter</kbd> to execute
                      </span>
                    </div>
                  </div>
                ) : model.type === ModelType.DIFFUSION ? (
                  <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Generation Prompt
                      </label>
                      <textarea
                        className="w-full bg-[#0a0b0e] text-zinc-200 border border-border/80 rounded-xl font-sans text-xs p-3.5 h-24 focus:outline-none focus:ring-2 focus:ring-primary/45 resize-none leading-relaxed"
                        placeholder="e.g. A vibrant futuristic cyberpunk marketplace, glowing neon signs, cinematic render"
                        value={diffusionPrompt}
                        onChange={(e) => handleDiffusionPromptChange(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    <div className="space-y-4">
                      {/* Inference Steps Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-primary" /> Inference Steps
                          </span>
                          <span className="font-mono font-bold text-primary">{diffusionSteps}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                          value={diffusionSteps}
                          onChange={(e) => handleDiffusionStepsChange(parseInt(e.target.value))}
                          disabled={isRunning}
                        />
                      </div>

                      {/* Guidance Scale Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-primary" /> Guidance Scale
                          </span>
                          <span className="font-mono font-bold text-primary">{diffusionGuidance.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={20.0}
                          step={0.5}
                          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                          value={diffusionGuidance}
                          onChange={(e) => handleDiffusionGuidanceChange(parseFloat(e.target.value))}
                          disabled={isRunning}
                        />
                      </div>
                    </div>
                  </div>
                ) : model.type === ModelType.VISION && visionMode === "visual" ? (
                  <div className="flex-1 p-5 flex flex-col justify-center items-center overflow-y-auto bg-slate-950/5">
                    {selectedImagePreview ? (
                      <div className="relative group max-w-full flex flex-col items-center animate-fade-in">
                        <img
                          src={selectedImagePreview}
                          alt="Selected preview"
                          className="max-h-56 object-contain rounded-xl border border-border shadow-md"
                        />
                        <button
                          onClick={() => setPayload(JSON.stringify({ image: "base64_encoded_image_string" }, null, 2))}
                          className="mt-3.5 text-[10px] text-red-500 hover:text-red-600 font-bold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-all cursor-pointer hover:bg-red-500/20 hover-lift active-shrink"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-all rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer w-full max-w-xs bg-background/50 hover:bg-background/80 hover-lift active-shrink shadow-inner">
                        <Upload className="w-8 h-8 text-muted-foreground/60 mb-2.5 animate-pulse" />
                        <span className="font-bold text-[11px] text-foreground">Click to upload image</span>
                        <span className="text-[9px] text-muted-foreground mt-1 select-none">Supports PNG, JPG, JPEG</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={isRunning}
                        />
                      </label>
                    )}
                    <div className="mt-4 w-full border-t border-border/30 pt-3 flex justify-center select-none">
                      <span className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">
                        Auto-converts to Base64 in JSON request
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex-1 flex bg-[#0d0e15] border-t border-border/50 overflow-hidden h-full text-zinc-100">
                    {/* Line Numbers Column */}
                    <div className="w-10 select-none text-right pr-2.5 text-zinc-500 border-r border-zinc-800 py-4 bg-[#08090c] overflow-hidden font-mono text-[10px] leading-relaxed flex flex-col gap-0.5">
                      {lineNumbers.map((num) => (
                        <div key={num} className="h-5">{num}</div>
                      ))}
                    </div>
                    {/* Textarea */}
                    <textarea
                      className="flex-1 bg-transparent text-zinc-100 font-mono text-[11px] p-4 pl-3.5 overflow-auto resize-none focus:outline-none leading-relaxed border-0 h-full w-full outline-none focus:ring-0"
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      spellCheck={false}
                    />
                    {!isValidJson && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-950/90 border-t border-red-500/30 p-2.5 text-[10px] font-mono text-red-400 flex items-center gap-2 z-10 select-none">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                        <span className="line-clamp-1 font-semibold">{jsonError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Toolbar - directly attached underneath Inputs */}
            <div className="flex justify-end gap-3 select-none">
              <button 
                onClick={handleReset} 
                className="btn-outline flex items-center gap-1.5 font-bold h-9.5 text-xs rounded-xl" 
                title="Reset to template"
                disabled={!isAuthenticated}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Template
              </button>
              {isLlm && llmMode === "chat" ? (
                isStreaming ? (
                  <button
                    onClick={handleStopStream}
                    className="btn-primary flex items-center gap-1.5 font-bold bg-red-600 hover:bg-red-700 border-none h-9.5 text-xs rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current animate-pulse" /> Stop Generating
                  </button>
                ) : (
                  <button
                    onClick={handleLlmSend}
                    className="btn-primary flex items-center gap-1.5 font-bold h-9.5 text-xs rounded-xl shadow-md hover:shadow-lg transition-all"
                    disabled={!isAuthenticated || isRunning || !userMessage.trim()}
                  >
                    <Send className="w-3.5 h-3.5" /> {isRunning ? "Generating..." : "Send Message"}
                  </button>
                )
              ) : (
                isStreaming ? (
                  <button
                    onClick={handleStopStream}
                    className="btn-primary flex items-center gap-1.5 font-bold bg-red-600 hover:bg-red-700 border-none h-9.5 text-xs rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current animate-pulse" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleRun()}
                    className="btn-primary flex items-center gap-1.5 font-bold h-9.5 text-xs rounded-xl shadow-md hover:shadow-lg transition-all"
                    disabled={!isAuthenticated || isRunning || !isValidJson}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> {isRunning ? "Executing..." : "Run Inference"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* RIGHT: Response Outputs & Latency indicators (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="border border-border/80 bg-[#0c0d12]/95 rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-lg relative transition-all duration-300 hover:border-border/100">
              <div className="p-4 border-b border-border/50 flex justify-between items-center bg-[#07080b]/90 select-none">
                <div className="flex items-center gap-2 font-bold text-zinc-300 text-xs">
                  {isLlm ? <Bot className="w-4 h-4 text-primary animate-pulse" /> : <Sparkles className="w-4 h-4 text-primary" />}
                  {isLlm ? "Assistant Response" : "Response Output"}
                </div>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary animate-pulse">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Streaming...
                    </span>
                  )}
                  {httpStatus && (
                    <div
                      className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono ${
                        httpStatus.startsWith("200") ? "text-emerald-400" : "text-red-400"
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
              <div ref={llmOutputRef} className="flex-1 bg-[#06070a] text-zinc-300 font-mono text-[11px] p-0 overflow-auto leading-relaxed flex flex-col">
                {base64Image ? (
                  <div className="flex flex-col items-center justify-center p-3.5 bg-zinc-950/80 border border-border/60 rounded-2xl max-w-full m-5 self-center shadow-lg animate-fade-in">
                    <img
                      src={`data:image/png;base64,${base64Image}`}
                      alt="Generated output"
                      className="max-h-64 object-contain rounded-xl shadow-md"
                    />
                    <span className="text-[9px] text-zinc-400 mt-3 font-sans font-bold uppercase tracking-wider">Generated Image Output</span>
                  </div>
                ) : isLlm && (result || isStreaming) ? (
                  /* LLM streaming output with chat-like appearance */
                  <div className="p-6 h-full flex flex-col justify-start">
                    <div className="flex gap-4 items-start">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold text-muted-foreground font-sans mb-1.5 uppercase tracking-widest">Assistant</p>
                        <div className="text-[13px] text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap break-words font-normal">
                          {result}
                          {isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-primary ml-1 align-text-bottom animate-pulse" />
                          )}
                        </div>
                        {/* Token stats footer */}
                        {!isStreaming && tokenStats && (
                          <div className="mt-5 pt-3.5 border-t border-border/30 flex items-center gap-4 text-[10px] text-muted-foreground font-sans select-none">
                            <span className="flex items-center gap-1 font-semibold text-amber-500">
                              <Zap className="w-3 h-3 fill-current" />
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
                  <pre className="whitespace-pre-wrap p-4.5 text-left self-start h-full w-full font-mono text-[11px] leading-relaxed text-zinc-300 overflow-auto">{result}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3 select-none">
                    {isLlm ? (
                      <>
                        <Bot className="w-9 h-9 opacity-35 animate-pulse text-primary" />
                        <p className="text-[11px] font-sans">Type a message and press Send to start the playground sandbox.</p>
                      </>
                    ) : (
                      <>
                        <TerminalIcon className="w-9 h-9 opacity-35 animate-pulse text-primary" />
                        <p className="text-[11px] font-sans text-center px-4">Click &quot;Run Inference&quot; to execute the prediction query and view output telemetry.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Metrics Row - attached underneath outputs */}
            <div className="grid grid-cols-3 gap-4 select-none">
              <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-3.5 py-3 px-4 rounded-xl shadow-xs hover:border-border transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 border border-blue-500/20 shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">Latency</p>
                  <p className="text-sm font-extrabold text-foreground font-mono leading-none">{lastLatency}</p>
                </div>
              </div>
              <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-3.5 py-3 px-4 rounded-xl shadow-xs hover:border-border transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
                  {isLlm ? <Zap className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">{isLlm ? "Speed" : "Confidence"}</p>
                  <p className="text-sm font-extrabold text-foreground font-mono leading-none truncate">{isLlm && tokenStats ? `${tokenStats.tokensPerSec} t/s` : lastConfidence}</p>
                </div>
              </div>
              <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-3.5 py-3 px-4 rounded-xl shadow-xs hover:border-border transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-550/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">Memory</p>
                  <p className="text-sm font-extrabold text-foreground font-mono leading-none">{lastMemory}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Lock Overlay for Guests (locks both columns together) */}
        {!isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 bg-background/30 backdrop-blur-[4px] transition-all duration-355">
            <div className="bg-card/90 dark:bg-zinc-950/90 border border-border rounded-2xl p-8 shadow-xl max-w-sm space-y-5 animate-fade-in backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-bounce">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-sm font-black text-foreground">Interactive Playground Locked</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign in or register a free account to execute live predictions and test sandbox models.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2 select-none">
                <Link
                  href="/login"
                  className="btn-outline px-4.5 py-2.5 text-xs font-bold rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-4.5 py-2.5 text-xs font-bold rounded-xl"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
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
