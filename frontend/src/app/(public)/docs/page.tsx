import React from "react";
import { Metadata } from "next";
import DocsClient from "./DocsClient";

export const metadata: Metadata = {
  title: "Developer Manual | AI Platform Governance & Prediction Marketplace",
  description: "Comprehensive documentation for developers integrating with the AI prediction platform. Explore multi-tenant workspaces, sandbox test suites, double-entry wallets, API keys quotas, Loki logs telemetry, and MCP server tools.",
  keywords: ["AI Governance", "ML Ops Sandbox", "Model Marketplace", "Stripe Credits", "API Keys Rate Limits", "Model Context Protocol", "Inference Telemetry", "Postgres Ledger"],
  openGraph: {
    title: "Developer Manual | AI Platform Governance & Prediction Marketplace",
    description: "API specifications, sandbox testing suites, double-entry wallets, rate limits, Loki telemetry, and MCP server integrations.",
    type: "website",
    locale: "en_US",
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
