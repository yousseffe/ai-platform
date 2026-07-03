"use client";

import React, { useState } from "react";
import { Code2, BookOpen, Layers, Cpu, Clock, Copy, Check } from "lucide-react";
import { Model } from "@/types";
import { UsageMetricsCard } from "./UsageMetricsCard";

interface ModelOverviewProps {
  model: Model;
  selectedVersionNumber?: number;
}

/**
 * ModelOverview component rendering description, weights metadata,
 * and code snippets for Python, Javascript, and cURL prediction endpoint consumption.
 * Supports active language toggle, copying code to clipboard, and syntax highlighting.
 */
export default function ModelOverview({
  model,
  selectedVersionNumber,
}: ModelOverviewProps) {
  const [activeLang, setActiveLang] = useState<"curl" | "python" | "js">(
    "curl",
  );
  const [copied, setCopied] = useState(false);

  const versions = model.versions || [];
  const activeVersion = selectedVersionNumber
    ? versions.find((v) => v.versionNumber === selectedVersionNumber)
    : versions.length
      ? [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
      : null;

  const backendUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BACKEND_URL || window.location.origin
      : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

  const urlPath = selectedVersionNumber
    ? `${backendUrl}/api/v1/models/${model.id}/v${selectedVersionNumber}/predict`
    : `${backendUrl}/api/v1/models/${model.id}/predict`;

  const getCurlCode = () => `curl -X POST ${urlPath} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '${activeVersion?.examplePayload || '{"features": [1.2, 3.4, 5.6]}'}'`;

  const getPythonCode = () => `import requests

url = "${urlPath}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}
payload = ${activeVersion?.examplePayload || '{\n    "features": [1.2, 3.4, 5.6]\n}'}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  const getJsCode = () => `const url = "${urlPath}";
const payload = ${activeVersion?.examplePayload || "{\n  features: [1.2, 3.4, 5.6]\n}"};

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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <p className="text-foreground text-sm font-semibold">
              {model.name}
            </p>
            <p>
              {model.description ||
                "No model description has been pushed to this repository yet."}
            </p>
          </div>

          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/50 text-[11px] font-sans">
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider text-[9px]">
                Tier
              </span>
              <span className="text-foreground font-semibold font-mono capitalize">
                {model.tier || "Standard"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider text-[9px]">
                Cost Per Request
              </span>
              <span className="text-foreground font-semibold font-mono">
                $
                {(() => {
                  const costVal =
                    typeof model.costPerRequest === "string"
                      ? parseFloat(model.costPerRequest)
                      : model.costPerRequest;
                  return typeof costVal === "number" && !isNaN(costVal)
                    ? costVal.toFixed(4)
                    : "0.0000";
                })()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider text-[9px]">
                Releases
              </span>
              <span className="text-foreground font-semibold font-mono">
                {versions.length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase font-bold tracking-wider text-[9px]">
                Visibility
              </span>
              <span className="text-foreground font-semibold font-mono capitalize font-mono text-xs">
                {model.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>
        </div>

        {/* Code Snippets Consumption Panel */}
        <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm font-sans">
          <div className="p-4 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Code2 className="w-4.5 h-4.5 text-primary" />
              <span className="text-sm">Endpoint Consumption</span>
            </div>
            <div className="flex bg-secondary p-0.5 rounded-lg border border-border self-start sm:self-auto">
              {(["curl", "python", "js"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${
                    activeLang === lang
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "curl"
                    ? "cURL"
                    : lang === "python"
                      ? "Python"
                      : "Node.js"}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint Details Banner */}
          <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[9px] tracking-wide">
                POST
              </span>
              <span className="text-muted-foreground truncate max-w-xs sm:max-w-md">
                /api/v1/models/{model.id}/predict
              </span>
            </div>
            <button
              onClick={() => {
                const code =
                  activeLang === "curl"
                    ? getCurlCode()
                    : activeLang === "python"
                      ? getPythonCode()
                      : getJsCode();
                handleCopy(code);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-secondary hover:text-foreground text-muted-foreground text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-medium">Copy code</span>
                </>
              )}
            </button>
          </div>

          {/* Code display with basic pseudo-syntax highlighting for elegance */}
          <div className="bg-[#0b0c0e] p-5 overflow-x-auto text-[11px] leading-relaxed relative">
            <pre className="font-mono whitespace-pre text-slate-300">
              {activeLang === "curl" && (
                <code>
                  <span className="text-pink-400">curl</span>{" "}
                  <span className="text-indigo-400">-X</span> POST {urlPath} \
                  <br />
                  &nbsp;&nbsp;<span className="text-indigo-400">-H</span>{" "}
                  <span className="text-emerald-400">
                    {'"Content-Type: application/json"'}
                  </span>{" "}
                  \<br />
                  &nbsp;&nbsp;<span className="text-indigo-400">-H</span>{" "}
                  <span className="text-emerald-400">
                    {'"Authorization: Bearer YOUR_JWT_TOKEN"'}
                  </span>{" "}
                  \<br />
                  &nbsp;&nbsp;<span className="text-indigo-400">-d</span>{" "}
                  <span className="text-amber-300">{"'"}</span>
                  {activeVersion?.examplePayload ||
                    '{"features": [1.2, 3.4, 5.6]'}
                  <span className="text-amber-300">{"'"}</span>
                </code>
              )}
              {activeLang === "python" && (
                <code>
                  <span className="text-pink-400">import</span> requests
                  <br />
                  <br />
                  url ={" "}
                  <span className="text-emerald-400">
                    {'"'}
                    {urlPath}
                    {'"'}
                  </span>
                  <br />
                  headers = &#123;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="text-emerald-400">
                    {'"Content-Type"'}
                  </span>:{" "}
                  <span className="text-emerald-400">
                    {'"application/json"'}
                  </span>
                  ,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="text-emerald-400">
                    {'"Authorization"'}
                  </span>:{" "}
                  <span className="text-emerald-400">
                    {'"Bearer YOUR_JWT_TOKEN"'}
                  </span>
                  <br />
                  &#125;
                  <br />
                  payload ={" "}
                  <span className="text-amber-300">
                    {activeVersion?.examplePayload ||
                      '{\n    "features": [1.2, 3.4, 5.6]\n}'}
                  </span>
                  <br />
                  <br />
                  response = requests.
                  <span className="text-indigo-400">post</span>(url,
                  json=payload, headers=headers)
                  <br />
                  <span className="text-pink-400">print</span>(response.
                  <span className="text-indigo-400">json</span>())
                </code>
              )}
              {activeLang === "js" && (
                <code>
                  <span className="text-pink-400">const</span> url ={" "}
                  <span className="text-emerald-400">
                    {'"'}
                    {urlPath}
                    {'"'}
                  </span>
                  ;<br />
                  <span className="text-pink-400">const</span> payload ={" "}
                  <span className="text-amber-300">
                    {activeVersion?.examplePayload ||
                      "{\n  features: [1.2, 3.4, 5.6]\n}"}
                  </span>
                  ;<br />
                  <br />
                  <span className="text-pink-400">const</span> response ={" "}
                  <span className="text-pink-400">await</span>{" "}
                  <span className="text-indigo-400">fetch</span>(url, &#123;
                  <br />
                  &nbsp;&nbsp;method:{" "}
                  <span className="text-emerald-400">{'"POST"'}</span>,<br />
                  &nbsp;&nbsp;headers: &#123;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="text-emerald-400">
                    {'"Content-Type"'}
                  </span>:{" "}
                  <span className="text-emerald-400">
                    {'"application/json"'}
                  </span>
                  ,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="text-emerald-400">
                    {'"Authorization"'}
                  </span>:{" "}
                  <span className="text-emerald-400">
                    {'"Bearer YOUR_JWT_TOKEN"'}
                  </span>
                  <br />
                  &nbsp;&nbsp;&#125;,
                  <br />
                  &nbsp;&nbsp;body: JSON.
                  <span className="text-indigo-400">stringify</span>(payload)
                  <br />
                  &#125;);
                  <br />
                  <br />
                  <span className="text-pink-400">const</span> result ={" "}
                  <span className="text-pink-400">await</span> response.
                  <span className="text-indigo-400">json</span>();
                  <br />
                  console.<span className="text-indigo-400">log</span>(result);
                </code>
              )}
            </pre>
          </div>
          <div className="px-4 py-3 bg-secondary/10 border-t border-border/50 text-xs text-muted-foreground flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <p>
              Replace{" "}
              <code className="text-foreground font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">
                YOUR_JWT_TOKEN
              </code>{" "}
              with a valid API token generated in your{" "}
              <a
                href="/settings/api"
                className="text-primary hover:underline font-semibold"
              >
                API Settings
              </a>{" "}
              page.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Metrics & Infrastructure */}
      <div className="space-y-6">
        <UsageMetricsCard model={model} />

        {/* Infrastructure Specs */}
        <div className="border border-border bg-card rounded-xl p-5 font-mono text-xs">
          <h3 className="font-bold text-foreground mb-4 text-sm font-sans">
            Cluster specs
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Hardware
              </span>
              <span className="text-foreground font-bold">
                {model.tier === "premium" ? "NVIDIA A100 GPU" : "CPU - 4 Cores"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Autoscaler
              </span>
              <span className="text-foreground font-bold">
                {model.tier === "premium" ? "1 - 8 nodes" : "1 - 2 nodes"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Idle timeout
              </span>
              <span className="text-foreground font-bold">
                {model.tier === "premium" ? "5 mins" : "2 mins"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
