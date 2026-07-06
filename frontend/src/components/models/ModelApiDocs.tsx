"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Terminal,
  Code,
  Shield,
  Coins,
  Server,
  FileJson,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { Model, ModelIntegrationSpec } from "@/types";

interface ModelApiDocsProps {
  model: Model;
  integrationSpec: ModelIntegrationSpec | null;
}

function formatJson(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value ?? {}, null, 2);
}

export default function ModelApiDocs({
  model,
  integrationSpec,
}: ModelApiDocsProps) {
  const [activeTab, setActiveTab] = useState<"guide" | "openapi">("guide");
  const [activeLanguage, setActiveLanguage] = useState<"curl" | "python" | "js" | "go">("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const backendUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
  }, []);

  const openApiUrl = useMemo(() => {
    return `${backendUrl}/api/v1/models/${model.id}/openapi.json`;
  }, [backendUrl, model.id]);

  const openApiJson = useMemo(
    () => formatJson(integrationSpec?.openapi ?? {}),
    [integrationSpec],
  );

  const requestExample = useMemo(() => {
    if (!integrationSpec) return "{}";
    return formatJson(
      integrationSpec.request.example ?? integrationSpec.request.exampleRaw,
    );
  }, [integrationSpec]);

  const responseExample = useMemo(() => {
    if (!integrationSpec) return "{}";
    return formatJson(
      integrationSpec.response.example ?? integrationSpec.response.exampleRaw,
    );
  }, [integrationSpec]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const predictionUrl = useMemo(() => {
    if (!integrationSpec) return "";
    if (integrationSpec.endpoint.url) {
      return integrationSpec.endpoint.url;
    }
    const latestVersion = model.versions?.[model.versions.length - 1];
    const versionNum = latestVersion?.versionNumber;
    return versionNum
      ? `${backendUrl}/api/v1/models/${model.id}/v${versionNum}/predict`
      : `${backendUrl}/api/v1/models/${model.id}/predict`;
  }, [integrationSpec, model, backendUrl]);

  // Code snippets generator
  const codeSnippets = useMemo(() => {
    const formattedPayload = requestExample.replace(/\n/g, "\n  ");
    return {
      curl: `curl -X POST "${predictionUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${formattedPayload}'`,
      python: `import requests

url = "${predictionUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = ${requestExample}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      js: `const response = await fetch("${predictionUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${requestExample.trim().replace(/\n/g, "\n  ")})
});

const data = await response.json();
console.log(data);`,
      go: `package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"net/http"
)

func main() {
\turl := "${predictionUrl}"
\tpayload := []byte(\`${requestExample.trim()}\`)

\treq, _ := http.NewRequest("POST", url, bytes.NewBuffer(payload))
\treq.Header.Set("Authorization", "Bearer YOUR_API_KEY")
\treq.Header.Set("Content-Type", "application/json")

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tvar result map[string]interface{}
\tjson.NewDecoder(resp.Body).Decode(&result)
\tfmt.Println(result)
}`,
    };
  }, [predictionUrl, requestExample]);

  if (!integrationSpec) {
    return (
      <div className="border border-border bg-card rounded-2xl p-12 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-md">
          <BookOpen className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          API Documentation Not Ready Yet
        </h3>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-muted-foreground">
          This model repository needs at least one version tag successfully built and marked as <strong>READY</strong> before serverless endpoints, authentication parameters, and OpenAPI specifications can be generated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-foreground font-sans">
      {/* Premium OpenAPI Specs Hero Link Banner */}
      <div className="relative overflow-hidden border border-border bg-gradient-to-r from-card to-secondary/35 rounded-2xl p-6 sm:p-8 shadow-md">
        {/* Colorful glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-emerald-500">
                OpenAPI 3.1.0 Contract
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              API Specification & Interactive Docs
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              This model exposes a standards-compliant REST endpoint. You can directly inspect or download the JSON schema file to load it into API clients like <strong>Postman</strong>, <strong>Swagger UI</strong>, or <strong>Insomnia</strong>.
            </p>
          </div>

          {/* Quick-Action Links */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Clickable direct link to open the docs */}
            <a
              href={`/explore/${model.id}/swagger`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-5 shadow-lg shadow-primary/10 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <ArrowUpRight className="h-4 w-4" />
              Open Swagger Docs
            </a>
            
            <button
              onClick={() => handleCopy(openApiUrl, "spec-url")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-xs hover:bg-secondary px-4 text-xs font-semibold text-foreground transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              {copiedKey === "spec-url" ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Copied Link</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  <span>Copy Spec URL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab switchers at the bottom */}
        <div className="flex w-fit rounded-lg border border-border bg-secondary/50 p-0.5 mt-6 font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-4 text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "guide"
                ? "bg-card text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Integration Guide
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("openapi")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-4 text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "openapi"
                ? "bg-card text-primary shadow-xs border border-border/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileJson className="h-3.5 w-3.5" />
            Raw OpenAPI Schema
          </button>
        </div>
      </div>

      {activeTab === "guide" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: API parameters & Guides */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Endpoints & Methods */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Server className="h-4 w-4 text-primary" />
                  <span>API Endpoint</span>
                </div>
                <button
                  onClick={() => handleCopy(predictionUrl, "prediction-url")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg font-bold"
                  title="Copy Endpoint"
                >
                  {copiedKey === "prediction-url" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-secondary/25 p-3.5 font-mono">
                <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {integrationSpec.endpoint.method}
                </span>
                <span className="break-all text-[11px] text-muted-foreground select-all font-semibold">
                  {predictionUrl}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                  <span className="block text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Protocol / Style</span>
                  <span className="mt-1 block font-mono font-bold text-foreground text-xs uppercase">
                    {integrationSpec.endpoint.apiStyle === "openai-chat" ? "OpenAI Chat" : "Custom JSON"}
                  </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                  <span className="block text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Billing Tier</span>
                  <span className="mt-1 block font-mono font-bold text-foreground text-xs capitalize">
                    {integrationSpec.pricing.billingUnit || "Per request"}
                  </span>
                </div>
              </div>
            </div>

            {/* Authentication Header Setup */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm border-b border-border/50 pb-3">
                <Shield className="h-4 w-4 text-primary" />
                <span>Authentication</span>
              </div>

              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {integrationSpec.authentication.note || 
                 "Requests must include your private API key in the authorization headers. Treat your key as password credentials."}
              </p>

              <div className="rounded-xl border border-border bg-secondary/25 p-3.5 font-mono text-[11px]">
                <div className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider mb-1">Expected Header</div>
                <div className="text-foreground font-semibold select-all">
                  Authorization: Bearer <span className="text-primary font-bold">YOUR_API_KEY</span>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground flex gap-2">
                <span className="text-primary font-bold text-base leading-none">i</span>
                <span>
                  You can create, delete, and view your workspaces' secure tokens inside your developer <strong>Dashboard Settings</strong>. Never commit keys to public git repositories.
                </span>
              </div>
            </div>

            {/* Parameter specifications */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm border-b border-border/50 pb-3">
                <Code className="h-4 w-4 text-primary" />
                <span>Request Payload Structure</span>
              </div>

              <p className="text-muted-foreground leading-relaxed text-[11px]">
                JSON schema parameters supported by this model's predict configuration.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 font-semibold font-mono">Field</th>
                      <th className="py-2.5 font-semibold font-mono">Type</th>
                      <th className="py-2.5 font-semibold">Requirement</th>
                      <th className="py-2.5 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {integrationSpec.endpoint.apiStyle === "openai-chat" ? (
                      <>
                        <tr>
                          <td className="py-2.5 font-semibold font-mono text-foreground">messages</td>
                          <td className="py-2.5 font-mono text-muted-foreground">array[object]</td>
                          <td className="py-2.5"><span className="text-red-500 font-bold">Required</span></td>
                          <td className="py-2.5 text-muted-foreground">List of objects containing <code className="font-mono text-foreground font-semibold">role</code> ("system", "user", "assistant") and <code className="font-mono text-foreground font-semibold">content</code>.</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold font-mono text-foreground">temperature</td>
                          <td className="py-2.5 font-mono text-muted-foreground">number</td>
                          <td className="py-2.5 text-muted-foreground">Optional</td>
                          <td className="py-2.5 text-muted-foreground">Controls randomness (0.0 to 2.0). Defaults to 1.0.</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold font-mono text-foreground">max_tokens</td>
                          <td className="py-2.5 font-mono text-muted-foreground">integer</td>
                          <td className="py-2.5 text-muted-foreground">Optional</td>
                          <td className="py-2.5 text-muted-foreground">Maximum completion tokens to limit response length.</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-semibold font-mono text-foreground">stream</td>
                          <td className="py-2.5 font-mono text-muted-foreground">boolean</td>
                          <td className="py-2.5 text-muted-foreground">Optional</td>
                          <td className="py-2.5 text-muted-foreground">Enable server-sent events token stream.</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="py-2.5 font-semibold font-mono text-foreground">Custom JSON</td>
                          <td className="py-2.5 font-mono text-muted-foreground">object</td>
                          <td className="py-2.5"><span className="text-red-500 font-bold">Required</span></td>
                          <td className="py-2.5 text-muted-foreground">Dynamic schema. Structure matches request example shown in playground or schema files.</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Details */}
            {integrationSpec.pricing && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm border-b border-border/50 pb-3">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>Cost & Usage Limits</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {integrationSpec.pricing.creditsPerRequest !== undefined && (
                    <div className="rounded-xl border border-border bg-secondary/15 p-4 flex flex-col justify-between">
                      <span className="text-muted-foreground font-medium text-[10px] uppercase">Flat Predict Cost</span>
                      <span className="text-foreground font-mono font-bold text-lg mt-1">
                        {integrationSpec.pricing.creditsPerRequest.toFixed(4)} <span className="text-xs text-muted-foreground">Credits</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">Charged per single successful API request</span>
                    </div>
                  )}
                  {integrationSpec.pricing.inputCreditsPerMToken !== undefined && (
                    <div className="rounded-xl border border-border bg-secondary/15 p-4 flex flex-col justify-between">
                      <span className="text-muted-foreground font-medium text-[10px] uppercase">Token Based Inference</span>
                      <div className="space-y-1 mt-1 font-mono">
                        <div className="text-foreground font-bold text-xs">
                          In: {integrationSpec.pricing.inputCreditsPerMToken} <span className="font-normal text-[10px] text-muted-foreground">cr/M</span>
                        </div>
                        <div className="text-foreground font-bold text-xs">
                          Out: {integrationSpec.pricing.outputCreditsPerMToken} <span className="font-normal text-[10px] text-muted-foreground">cr/M</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Charged per million prompt/generation tokens</span>
                    </div>
                  )}
                </div>
                {integrationSpec.pricing.note && (
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed pt-1">
                    * {integrationSpec.pricing.note}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Code Generator / Sandbox Examples */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Language Sandbox */}
            <div className="rounded-2xl border border-border bg-[#0b0c0e] shadow-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#121318]">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span className="font-bold text-white tracking-wider uppercase font-mono text-[10px]">
                    Client Code Snippets
                  </span>
                </div>
                
                <button
                  onClick={() => handleCopy(codeSnippets[activeLanguage], `code-${activeLanguage}`)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1e2025] hover:bg-[#252830] px-3 py-1.5 text-[10px] font-bold text-white transition-all active:scale-95 cursor-pointer"
                >
                  {copiedKey === `code-${activeLanguage}` ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Language Tabs */}
              <div className="flex gap-1.5 px-5 py-2.5 border-b border-white/5 bg-[#121318]/50">
                {(["curl", "python", "js", "go"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLanguage(lang)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-all uppercase cursor-pointer ${
                      activeLanguage === lang
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {lang === "curl" ? "cURL" : lang === "python" ? "Python" : lang === "js" ? "JavaScript" : "Go"}
                  </button>
                ))}
              </div>

              {/* Pre Code Box */}
              <div className="p-5 overflow-auto max-h-[350px] font-mono text-[11px] leading-relaxed text-slate-300">
                <pre className="whitespace-pre">
                  <code>{codeSnippets[activeLanguage]}</code>
                </pre>
              </div>
            </div>

            {/* Request Schema example preview */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-background/50">
                <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">
                  Sample JSON Request Payload
                </div>
                <button
                  onClick={() => handleCopy(requestExample, "req-example")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg font-bold"
                  title="Copy Request Body"
                >
                  {copiedKey === "req-example" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="p-5 overflow-auto max-h-[250px] bg-[#0b0c0e] font-mono text-[11px] leading-relaxed text-slate-300 border-t border-border">
                <pre>
                  <code>{requestExample}</code>
                </pre>
              </div>
            </div>

            {/* Response Schema example preview */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-background/50">
                <div className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">
                  Sample JSON Response Payload
                </div>
                <button
                  onClick={() => handleCopy(responseExample, "res-example")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-lg font-bold"
                  title="Copy Response Body"
                >
                  {copiedKey === "res-example" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="p-5 overflow-auto max-h-[250px] bg-[#0b0c0e] font-mono text-[11px] leading-relaxed text-slate-300 border-t border-border">
                <pre>
                  <code>{responseExample}</code>
                </pre>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* OpenAPI Raw Spec View */
        <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-background/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono">
              <FileJson className="h-4 w-4 text-primary" />
              OpenAPI Specification JSON
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => handleCopy(openApiUrl, "copy-api-url")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {copiedKey === "copy-api-url" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copy Schema URL
              </button>
              <button
                onClick={() => handleCopy(openApiJson, "copy-api-json")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {copiedKey === "copy-api-json" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copy JSON Spec
              </button>
            </div>
          </div>
          <div className="p-5 overflow-auto max-h-[550px] bg-[#0b0c0e] font-mono text-[11px] leading-relaxed text-slate-300 border-t border-border select-all">
            <pre>
              <code>{openApiJson}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
