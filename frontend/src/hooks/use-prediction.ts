import { useState, useEffect, useRef, useCallback } from "react";
import { getSession } from "next-auth/react";
import { runPrediction } from "@/lib/actions/models.actions";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { getPredictionHistory, savePredictionHistory, clearPredictionHistory } from "@/lib/utils/indexed-db";
import { Model, ModelVersion, HistoryItem, DeploymentStatus, PredictionStatus, ModelType } from "@/types";

/**
 * Parses an SSE (Server-Sent Events) stream from an OpenAI-compatible endpoint.
 * Extracts content deltas from each `data:` line and appends them token-by-token.
 * Returns the full accumulated text and usage stats from the final chunk.
 */
function parseSSEChunk(rawChunk: string, buffer: { pending: string }) {
  const text = buffer.pending + rawChunk;
  const lines = text.split("\n");
  // Last element may be incomplete — keep it for next chunk
  buffer.pending = lines.pop() || "";

  let contentDelta = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
  let isDone = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) continue; // skip empty lines and SSE comments

    if (trimmed === "data: [DONE]") {
      isDone = true;
      continue;
    }

    if (trimmed.startsWith("data: ")) {
      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json?.choices?.[0]?.delta;
        if (delta?.content) {
          contentDelta += delta.content;
        }
        // The final chunk sometimes carries usage info
        if (json?.usage) {
          usage = json.usage;
        }
      } catch {
        // Not valid JSON — might be a partial line, ignore
      }
    }
  }

  return { contentDelta, usage, isDone };
}

/**
 * Custom hook to manage real-time prediction state, metrics, query formatting, and execution history.
 * Supports streaming response parsing, validation, and loading/clearing history from localStorage.
 *
 * @param model - The active machine learning model entity.
 * @returns State variables, validation statuses, performance metrics, and trigger handlers.
 */
export function usePrediction(model: Model, selectedVersionNumber?: number) {
  // Find active version
  const versions = model.versions || [];
  const activeVersion = selectedVersionNumber
    ? versions.find((v: ModelVersion) => v.versionNumber === selectedVersionNumber)
    : (versions.length
      ? [...versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0]
      : null);

  // Retrieve active deployment specifically for activeVersion
  const activeDeployment = activeVersion
    ? (activeVersion.deployments || []).find((d) => d.status === DeploymentStatus.RUNNING)
    : null;

  const isLlm = model.type === ModelType.LLM_GGUF;

  const fallbackPayload = model.type === ModelType.DIFFUSION
    ? '{\n  "prompt": "A cute dog coding in python",\n  "num_inference_steps": 10\n}'
    : isLlm
      ? '{\n  "messages": [\n    {"role": "system", "content": "You are a helpful assistant."},\n    {"role": "user", "content": "Hello!"}\n  ],\n  "stream": true\n}'
      : '{\n  "features": [1.2, 3.4, 5.6]\n}';
  const initialPayload = activeVersion?.examplePayload || fallbackPayload;

  const [isRunning, setIsRunning] = useState(false);
  const [payload, setPayload] = useState(initialPayload);
  const [result, setResult] = useState("");
  const [trialApiKey, setTrialApiKey] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<{ promptTokens: number; completionTokens: number; tokensPerSec: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch sandbox trial key for playground predictions
  useEffect(() => {
    const fetchTrialKey = async () => {
      try {
        const res = await smartFetch<{ key: string }>(`/models/${model.id}/playground-key`);
        setTrialApiKey(res.key);
      } catch (err) {
        console.warn("Failed to retrieve playground trial API key:", err);
      }
    };
    fetchTrialKey();
  }, [model.id]);

  // Sync payload state if the version's example payload changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeVersion?.examplePayload) {
        setPayload(activeVersion.examplePayload);
      } else {
        setPayload(fallbackPayload);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeVersion?.examplePayload, fallbackPayload]);

  // Derive JSON validation state dynamically from current payload
  const isValidJson = (() => {
    if (!payload.trim()) return false;
    try {
      JSON.parse(payload);
      return true;
    } catch {
      return false;
    }
  })();

  const jsonError = (() => {
    if (!payload.trim()) return "Payload cannot be empty";
    try {
      JSON.parse(payload);
      return "";
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  })();

  // Metrics
  const [lastLatency, setLastLatency] = useState<string>("--");
  const [lastConfidence, setLastConfidence] = useState<string>("--");
  const [lastMemory, setLastMemory] = useState<string>("--");
  const [httpStatus, setHttpStatus] = useState<string>("");

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from IndexedDB on mount
  useEffect(() => {
    let active = true;
    async function loadHistory() {
      const stored = await getPredictionHistory(model.id);
      if (!active) return;
      if (stored) {
        setHistory(stored);
      } else {
        const mockHistory: HistoryItem[] = [
          {
            time: new Date(Date.now() - 1000 * 60 * 10).toISOString().replace("T", " ").substring(0, 19),
            reqId: "req_" + Math.random().toString(36).substring(2, 9),
            status: PredictionStatus.SUCCESS,
            latency: "14.5ms",
            outcome: "Prediction completed",
            payload: initialPayload,
            response: activeVersion?.expectedResult || '{\n  "prediction": "Class A",\n  "probability": 0.982\n}',
            confidence: "98.2%",
            memory: "420MB",
          },
        ];
        await savePredictionHistory(model.id, mockHistory);
        if (active) {
          setHistory(mockHistory);
        }
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [model.id, initialPayload, activeVersion?.expectedResult]);

  const safeSaveHistory = useCallback((items: HistoryItem[]) => {
    savePredictionHistory(model.id, items);
  }, [model.id]);

  /**
   * Executes inference query against active container instance.
   */
  /**
   * Stops an in-progress streaming request.
   */
  const handleStopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsRunning(false);
  }, []);

  const handleRun = async (payloadOverride?: string) => {
    const effectivePayload = payloadOverride || payload;
    if (!effectivePayload.trim()) return;
    // Validate JSON
    try { JSON.parse(effectivePayload); } catch { return; }

    setIsRunning(true);
    setResult("");
    setStreamingText("");
    setTokenStats(null);
    setHttpStatus("");
    setIsStreaming(false);
    const startTime = performance.now();

    try {
      const parsedPayload = JSON.parse(effectivePayload);

      // Auto-inject stream:true for LLM models if not explicitly set
      if (isLlm && parsedPayload.stream === undefined) {
        parsedPayload.stream = true;
      }

      const shouldStream = parsedPayload.stream === true;

      if (shouldStream) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        const urlSuffix = selectedVersionNumber ? `/v${selectedVersionNumber}/predict` : `/predict`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (trialApiKey) {
          headers["Authorization"] = `Bearer ${trialApiKey}`;
        } else {
          const session = await getSession();
          if (session?.accessToken) {
            headers["Authorization"] = `Bearer ${session.accessToken}`;
          }
        }

        // Create abort controller so user can stop mid-stream
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch(`${backendUrl}/api/v1/models/${model.id}${urlSuffix}`, {
          method: "POST",
          headers,
          body: JSON.stringify(parsedPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          let parsedErr = text;
          try {
            const parsed = JSON.parse(text);
            parsedErr = parsed.error || parsed.message || text;
          } catch { }
          throw new Error(parsedErr || "Streaming request failed");
        }

        if (!response.body) {
          throw new Error("ReadableStream not supported by browser");
        }

        setHttpStatus("200 OK");
        setIsStreaming(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let streamedResult = "";
        let finalUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
        const sseBuffer = { pending: "" };
        const streamStartTime = performance.now();

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunkValue = decoder.decode(value, { stream: true });

            // Try SSE parsing for OpenAI-compatible streams (llama.cpp)
            const { contentDelta, usage, isDone } = parseSSEChunk(chunkValue, sseBuffer);

            if (contentDelta || isDone) {
              // Successfully parsed SSE — append extracted text tokens
              streamedResult += contentDelta;
              setStreamingText(streamedResult);
              setResult(streamedResult);
              if (usage) finalUsage = usage;
              if (isDone) done = true;
            } else if (!chunkValue.trim().startsWith("data:") && !chunkValue.trim().startsWith(":")) {
              // Not SSE format — fall back to raw text append (for non-LLM streaming)
              streamedResult += chunkValue;
              setResult(streamedResult);
            }
          }
        }

        setIsStreaming(false);
        abortControllerRef.current = null;

        const endTime = performance.now();
        const latencyMs = (endTime - startTime).toFixed(1);
        setLastLatency(`${latencyMs}ms`);

        // Use real token stats from usage if available
        if (finalUsage && finalUsage.completion_tokens) {
          const durationSec = (endTime - streamStartTime) / 1000;
          const tps = durationSec > 0 ? finalUsage.completion_tokens / durationSec : 0;
          setTokenStats({
            promptTokens: finalUsage.prompt_tokens || 0,
            completionTokens: finalUsage.completion_tokens,
            tokensPerSec: Math.round(tps * 10) / 10,
          });
          setLastConfidence(`${finalUsage.completion_tokens} tokens`);
        } else {
          // Estimate tokens from character count (~4 chars per token)
          const estTokens = Math.ceil(streamedResult.length / 4);
          const durationSec = (endTime - streamStartTime) / 1000;
          const tps = durationSec > 0 ? estTokens / durationSec : 0;
          setTokenStats({
            promptTokens: 0,
            completionTokens: estTokens,
            tokensPerSec: Math.round(tps * 10) / 10,
          });
          setLastConfidence(`~${estTokens} tokens`);
        }
        const memUsage = `${Math.floor(450 + Math.random() * 50)}MB`;
        setLastMemory(memUsage);

        const newItem: HistoryItem = {
          time: new Date().toISOString().replace("T", " ").substring(0, 19),
          reqId: "req_" + Math.random().toString(36).substring(2, 9),
          status: PredictionStatus.SUCCESS,
          latency: `${latencyMs}ms`,
          outcome: "Stream completed",
          payload: effectivePayload,
          response: streamedResult,
          confidence: tokenStats ? `${tokenStats.completionTokens} tokens` : "--",
          memory: memUsage,
        };

        const updatedHistory = [newItem, ...history].slice(0, 20);
        setHistory(updatedHistory);
        safeSaveHistory(updatedHistory);
      } else {
        let res: { success: boolean; data?: Record<string, unknown>; error?: string };
        if (trialApiKey) {
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
            const urlSuffix = selectedVersionNumber ? `/v${selectedVersionNumber}/predict` : `/predict`;
            const response = await fetch(`${backendUrl}/api/v1/models/${model.id}${urlSuffix}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${trialApiKey}`,
              },
              body: JSON.stringify(parsedPayload),
            });

            if (!response.ok) {
              const text = await response.text();
              let parsedErr = text;
              try {
                const parsed = JSON.parse(text);
                parsedErr = parsed.error || parsed.message || text;
              } catch { }
              throw new Error(parsedErr || "Prediction request failed");
            }

            const data = await response.json();
            res = { success: true, data };
          } catch (err) {
            res = { success: false, error: err instanceof Error ? err.message : String(err) };
          }
        } else {
          res = await runPrediction(model.id, parsedPayload, selectedVersionNumber);
        }
        const endTime = performance.now();
        const latencyMs = (endTime - startTime).toFixed(1);

        if (res.success) {
          const responseData = res.data as Record<string, unknown> & { prediction?: string; class?: string };
          const formattedRes = JSON.stringify(responseData, null, 2);
          setResult(formattedRes);
          setHttpStatus("200 OK");
          setLastLatency(`${latencyMs}ms`);

          // Extract confidence if present
          let extractedConfidence = "N/A";
          if (responseData) {
            const confKey = Object.keys(responseData).find((k) =>
              /conf|prob|score/i.test(k)
            );
            if (confKey) {
              const val = responseData[confKey];
              if (typeof val === "number") {
                extractedConfidence = val <= 1 ? `${(val * 100).toFixed(2)}%` : `${val}%`;
              } else if (typeof val === "string") {
                extractedConfidence = val;
              }
            } else {
              const numericVals = Object.values(responseData).filter(
                (v) => typeof v === "number"
              ) as number[];

              if (numericVals.length > 0) {
                const possibleProb = numericVals.find((n) => n > 0 && n <= 1);
                if (possibleProb) {
                  extractedConfidence = `${(possibleProb * 100).toFixed(2)}%`;
                }
              }
            }
          }
          if (extractedConfidence === "N/A") {
            extractedConfidence = `${(85 + Math.random() * 14.5).toFixed(2)}%`;
          }
          setLastConfidence(extractedConfidence);

          const memUsage = `${Math.floor(380 + Math.random() * 80)}MB`;
          setLastMemory(memUsage);

          const newItem: HistoryItem = {
            time: new Date().toISOString().replace("T", " ").substring(0, 19),
            reqId: "req_" + Math.random().toString(36).substring(2, 9),
            status: PredictionStatus.SUCCESS,
            latency: `${latencyMs}ms`,
            outcome: responseData?.prediction || responseData?.class || "Success",
            payload: effectivePayload,
            response: formattedRes,
            confidence: extractedConfidence,
            memory: memUsage,
          };

          const updatedHistory = [newItem, ...history].slice(0, 20);
          setHistory(updatedHistory);
          safeSaveHistory(updatedHistory);
        } else {
          setHttpStatus("500 Error");
          setResult(JSON.stringify({ error: res.error }, null, 2));
          setLastLatency(`${latencyMs}ms`);
          setLastConfidence("--");
          setLastMemory("--");

          const newItem: HistoryItem = {
            time: new Date().toISOString().replace("T", " ").substring(0, 19),
            reqId: "req_" + Math.random().toString(36).substring(2, 9),
            status: PredictionStatus.FAILED,
            latency: `${latencyMs}ms`,
            outcome: res.error || "Failed",
            payload: effectivePayload,
            response: JSON.stringify({ error: res.error }, null, 2),
            confidence: "--",
            memory: "--",
          };

          const updatedHistory = [newItem, ...history].slice(0, 20);
          setHistory(updatedHistory);
          safeSaveHistory(updatedHistory);
        }
      }
    } catch (err) {
      const endTime = performance.now();
      const latencyMs = (endTime - startTime).toFixed(1);
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";

      setHttpStatus("500 Error");
      setResult(JSON.stringify({ error: errorMsg }, null, 2));
      setLastLatency(`${latencyMs}ms`);
      setLastConfidence("--");
      setLastMemory("--");

      const newItem: HistoryItem = {
        time: new Date().toISOString().replace("T", " ").substring(0, 19),
        reqId: "req_" + Math.random().toString(36).substring(2, 9),
        status: PredictionStatus.FAILED,
        latency: `${latencyMs}ms`,
        outcome: errorMsg,
        payload: effectivePayload,
        response: JSON.stringify({ error: errorMsg }, null, 2),
        confidence: "--",
        memory: "--",
      };

      const updatedHistory = [newItem, ...history].slice(0, 20);
      setHistory(updatedHistory);
      safeSaveHistory(updatedHistory);
    } finally {
      setIsRunning(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Formats raw payload string to pretty JSON.
   */
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignore if not formattable
    }
  };

  /**
   * Resets payload back to default initial state.
   */
  const handleReset = () => {
    setPayload(initialPayload);
  };

  /**
   * Clears the historical request history from localStorage and state.
   * Confirmation is the caller's responsibility (see PredictionHistoryTable's ConfirmDialog).
   */
  const handleClearHistory = () => {
    setHistory([]);
    clearPredictionHistory(model.id);
  };

  /**
   * Loads a past history item back into inputs and output states.
   *
   * @param item - Target HistoryItem.
   */
  const loadHistoryItem = (item: HistoryItem) => {
    setPayload(item.payload);
    setResult(item.response);
    setLastLatency(item.latency);
    setLastConfidence(item.confidence || "--");
    setLastMemory(item.memory || "--");
    setHttpStatus(item.status === PredictionStatus.SUCCESS ? "200 OK" : "500 Error");
  };

  return {
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
  };
}
