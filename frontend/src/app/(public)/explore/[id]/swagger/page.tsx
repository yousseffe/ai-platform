"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Props for the SwaggerPage route page.
 */
interface Props {
  /** Next.js routing parameters containing the dynamic model id. */
  params: Promise<{ id: string }>;
}

interface SwaggerUIBundleConfig {
  url: string;
  dom_id: string;
  deepLinking: boolean;
  presets: unknown[];
  layout: string;
}

type SwaggerUIBundleFunction = ((config: SwaggerUIBundleConfig) => void) & {
  presets: {
    apis: unknown;
  };
};

interface CustomWindow extends Window {
  SwaggerUIBundle?: SwaggerUIBundleFunction;
}

/**
 * Public route page that hosts the interactive Swagger UI sandbox for a model.
 * It dynamically embeds Swagger UI CSS and JS scripts from unpkg CDN,
 * binds it to the model's backend OpenAPI JSON schema, and enables developers
 * to test inference requests with their own API tokens directly.
 *
 * @param props - Sibling parameters containing the dynamic model id.
 * @returns The full-page interactive Swagger sandbox UI layout.
 */
export default function SwaggerPage({ params }: Props) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const backendUrl = React.useMemo(() => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
  }, []);

  const openApiUrl = React.useMemo(() => {
    return `${backendUrl}/api/v1/models/${id}/openapi.json`;
  }, [backendUrl, id]);

  useEffect(() => {
    // 1. Load the Swagger UI CSS file
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    link.id = "swagger-ui-css";
    document.head.appendChild(link);

    // 2. Load the Swagger UI Bundle JS script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.id = "swagger-ui-js";
    script.onload = () => {
      const customWindow = window as unknown as CustomWindow;
      if (customWindow.SwaggerUIBundle) {
        customWindow.SwaggerUIBundle({
          url: openApiUrl,
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            customWindow.SwaggerUIBundle.presets.apis,
          ],
          layout: "BaseLayout",
        });
      }
    };
    document.body.appendChild(script);

    // Cleanup scripts and stylesheets on unmount
    return () => {
      const existingLink = document.getElementById("swagger-ui-css");
      if (existingLink) {
        existingLink.remove();
      }
      const existingScript = document.getElementById("swagger-ui-js");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [openApiUrl]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <title>API Sandbox & Swagger Docs — Qantara</title>

      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/explore/${id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-all active:scale-95 cursor-pointer hover:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Details</span>
          </Link>
          <span className="h-5 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white font-mono uppercase">
              Swagger API Sandbox
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
              Interactive prediction console for model ID: {id}
            </p>
          </div>
        </div>

        {/* Source Schema Info */}
        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 self-start sm:self-auto bg-slate-900/40 border border-slate-800/80 px-3 py-1.5 rounded-lg">
          <span>Schema:</span>
          <a
            href={openApiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold break-all"
          >
            {openApiUrl}
          </a>
        </div>
      </header>

      {/* Swagger UI Container */}
      <div className="flex-1 bg-white p-4 sm:p-8">
        <div className="max-w-6xl mx-auto rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-xs">
          <div id="swagger-ui" />
        </div>
      </div>
    </div>
  );
}
