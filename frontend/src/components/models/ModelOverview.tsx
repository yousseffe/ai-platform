"use client";

import React, { useState } from "react";
import { Code2, BookOpen, Layers, Cpu, Clock } from "lucide-react";
import { Model } from "@/types";
import { UsageMetricsCard } from "./UsageMetricsCard";

interface ModelOverviewProps {
  model: Model;
}

/**
 * ModelOverview component rendering description, weights metadata,
 * and code snippets for Python, Javascript, and cURL prediction endpoint consumption.
 */
export default function ModelOverview({ model }: ModelOverviewProps) {
  const [activeLang, setActiveLang] = useState<"curl" | "python" | "js">("curl");

  const versions = model.versions || [];
  const latestVersion = versions.length
    ? [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
    : null;

  const getCurlCode = () => `curl -X POST http://localhost:3000/api/v1/models/${model.id}/predict \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '${latestVersion?.examplePayload || '{"features": [1.2, 3.4, 5.6]}'}'`;

  const getPythonCode = () => `import requests

url = "http://localhost:3000/api/v1/models/${model.id}/predict"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}
payload = ${latestVersion?.examplePayload || '{\n    "features": [1.2, 3.4, 5.6]\n}'}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  const getJsCode = () => `const url = "http://localhost:3000/api/v1/models/${model.id}/predict";
const payload = ${latestVersion?.examplePayload || '{\n  features: [1.2, 3.4, 5.6]\n}'};

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log(result);`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Repository details, weights structure & README */}
      <div className="lg:col-span-2 space-y-6 font-mono text-xs">
        {/* Repository Description Card */}
        <div className="border border-border bg-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <BookOpen className="w-4 h-4 text-primary" /> README.md
          </div>
          <div className="w-full h-px bg-border" />
          <div className="text-muted-foreground leading-relaxed space-y-3 font-sans text-xs">
            <p className="text-foreground text-sm font-semibold">{model.name}</p>
            <p>{model.description || "No model description has been pushed to this repository yet."}</p>
          </div>

          <div className="pt-4 grid grid-cols-3 gap-4 border-t border-border/50 text-[10px]">
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider">Params</span>
              <span className="text-foreground font-bold font-mono">340M</span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider">Arch</span>
              <span className="text-foreground font-bold font-mono">Transformer-XL</span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider">Epochs</span>
              <span className="text-foreground font-bold font-mono">1,200</span>
            </div>
          </div>
        </div>

        {/* Code Snippets Consumption Panel */}
        <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-background flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Code2 className="w-4 h-4 text-primary" /> Endpoint consumption
            </div>
            <div className="flex bg-muted p-0.5 rounded border border-border">
              <button
                onClick={() => setActiveLang("curl")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  activeLang === "curl" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveLang("python")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  activeLang === "python" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setActiveLang("js")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  activeLang === "js" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Node.js
              </button>
            </div>
          </div>
          <div className="bg-black/35 p-5 overflow-x-auto text-[11px] leading-relaxed relative">
            <pre className="text-emerald-400 font-mono whitespace-pre-wrap">
              {activeLang === "curl" && getCurlCode()}
              {activeLang === "python" && getPythonCode()}
              {activeLang === "js" && getJsCode()}
            </pre>
          </div>
        </div>
      </div>

      {/* Right Column: Metrics & Infrastructure */}
      <div className="space-y-6">
        <UsageMetricsCard />

        {/* Infrastructure Specs */}
        <div className="border border-border bg-card rounded-xl p-5 font-mono text-xs">
          <h3 className="font-bold text-foreground mb-4 text-sm">Cluster specs</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Hardware</span>
              <span className="text-foreground font-bold">NVIDIA A100 GPU</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Autoscaler</span>
              <span className="text-foreground font-bold">1 - 8 nodes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Idle timeout</span>
              <span className="text-foreground font-bold">5 mins</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
