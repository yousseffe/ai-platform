"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, CheckCircle2, ChevronRight } from "lucide-react";

interface ActionsTerminalProps {
  versionId: string;
  versionNumber: number;
  status: string;
}

const MOCK_BUILD_LOGS = [
  "Initializing container orchestrator...",
  "Loading Docker engine v24.0.5 daemon context...",
  "Fetching base image dependencies...",
  "Run actions/checkout@v3 to sync version metadata",
  "Download weights file from secure S3 bucket... [OK]",
  "Run docker build -t mlhub-registry/model:v2 .",
  "Sending build context to Docker daemon 289.4MB",
  "Step 1/6 : FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime",
  " ---> 3f5a9e5b7c8d",
  "Step 2/6 : WORKDIR /workspace",
  " ---> Running in container d8e9c7b6a5f4",
  "Step 3/6 : COPY model_weights.pth preprocess.py postprocess.py /workspace/",
  " ---> Pushed weights artifacts [OK]",
  "Step 4/6 : RUN pip install --no-cache-dir requests pillow numpy torchvision scikit-learn",
  "Collecting requests...",
  "  Downloading requests-2.31.0-py3-none-any.whl (62 kB)",
  "Collecting pillow...",
  "  Downloading Pillow-10.0.0-cp310-cp310-manylinux_2_28_x86_64.whl (3.4 MB)",
  "Installing collected packages: requests, pillow, numpy",
  "Successfully installed dependencies in 4.2 seconds.",
  " ---> Pushed requirements [OK]",
  "Step 5/6 : EXPOSE 8000",
  " ---> Port exposing completed [OK]",
  "Step 6/6 : ENTRYPOINT [\"python\", \"-m\", \"mlhub.server\"]",
  " ---> Compiled entrypoint configurations [OK]",
  "Successfully built image 9e8d7c6b5a4f",
  "Successfully tagged mlhub-registry/model:v2",
  "Pushing Docker image weights registry... [OK]",
  "Deploying active sandbox container on A100 node...",
  "Running container health readiness probes...",
  "Probe 1/3: GET /health ... 503 Service Unavailable",
  "Probe 2/3: GET /health ... 503 Service Unavailable",
  "Probe 3/3: GET /health ... 200 OK",
  "Sandbox container is live and listening on port 8000!",
  "Execution endpoint: http://localhost:8000/predictions/predict",
];

/**
 * Renders a terminal console displaying build output logs styled like GitHub Actions.
 * Simulates streaming of logs sequentially.
 */
export default function ActionsTerminal({ versionId, versionNumber, status }: ActionsTerminalProps) {
  const isBuildActive = status === "building" || status === "starting" || status === "uploading";
  
  const [lines, setLines] = useState<string[]>(() => isBuildActive ? [] : MOCK_BUILD_LOGS);
  const [isStreaming, setIsStreaming] = useState(isBuildActive);
  const [prevVersionId, setPrevVersionId] = useState(versionId);
  const [prevStatus, setPrevStatus] = useState(status);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // official React pattern to sync state when props change to prevent effect warnings
  if (versionId !== prevVersionId || status !== prevStatus) {
    setPrevVersionId(versionId);
    setPrevStatus(status);
    setLines(isBuildActive ? [] : MOCK_BUILD_LOGS);
    setIsStreaming(isBuildActive);
  }

  useEffect(() => {
    if (!isBuildActive) return;

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < MOCK_BUILD_LOGS.length) {
        setLines((prev) => [...prev, MOCK_BUILD_LOGS[currentLine]]);
        currentLine++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [versionId, isBuildActive]);

  // Scroll to bottom of terminal when logs are appended
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines]);

  return (
    <div className="border border-border bg-black/40 rounded-xl overflow-hidden shadow-sm font-mono text-xs text-foreground">
      {/* Console Header Bar */}
      <div className="p-3 bg-card border-b border-border flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="font-bold text-[11px] text-foreground">.github/workflows/deploy.yml</span>
          <span className="text-[10px] bg-muted border border-border px-1.5 py-0.2 rounded text-muted-foreground">v{versionNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> compiling container logs
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" /> build success
            </div>
          )}
        </div>
      </div>

      {/* Terminal Screen output */}
      <div className="p-5 h-72 bg-black/95 text-slate-300 font-mono text-[11px] overflow-y-auto leading-relaxed select-text space-y-1">
        {lines.map((line, idx) => {
          const isStep = line.startsWith("Step") || line.startsWith("Run");
          const isSuccess = line.includes("[OK]") || line.includes("SUCCESS") || line.includes("success");
          
          return (
            <div key={idx} className="flex items-start gap-1">
              <span className="text-muted-foreground/35 select-none w-5 text-right text-[10px] mr-2 pt-[1px]">{idx + 1}</span>
              <span className={isStep ? "text-primary font-bold" : isSuccess ? "text-emerald-400 font-bold" : "text-slate-300"}>
                {isStep && <ChevronRight className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />}
                {line}
              </span>
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
