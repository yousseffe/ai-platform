"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useModelDetails } from "@/hooks/use-model-details";
import type { Model } from "@/types";
import { UsageMetricsCard } from "@/components/models/UsageMetricsCard";
import { VersionHistoryTable } from "@/components/models/VersionHistoryTable";
import { UploadVersionModal } from "@/components/models/UploadVersionModal";

interface ModelDetailsClientProps {
  initialModel: Model;
  modelId: string;
}

/**
 * Client-side layout view for Model Details page.
 * Orchestrates modal controls, deployment actions, and renders components
 * representing stats and historical artifact version tables using a custom state hook.
 *
 * @param props - ModelDetailsClient component properties.
 * @returns The React component layout rendering model version grids.
 */
export default function ModelDetailsClient({ initialModel, modelId }: ModelDetailsClientProps) {
  const router = useRouter();
  const {
    model,
    versions,
    latestVersion,
    showVersionModal,
    setShowVersionModal,
    modelFile,
    setModelFile,
    scalerFile,
    setScalerFile,
    preprocessFile,
    setPreprocessFile,
    postprocessFile,
    setPostprocessFile,
    examplePayload,
    setExamplePayload,
    expectedResult,
    setExpectedResult,
    isUploading,
    handleDeploy,
    handleStop,
    handleUploadVersion,
  } = useModelDetails(modelId, initialModel);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{model.name}</h1>
            <span className="badge badge-info bg-indigo-50 text-indigo-700">STABLE</span>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6 max-w-3xl">
            {model.description || "No description provided."}
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Parameters</p>
              <p className="font-medium text-slate-900">340M</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Architecture</p>
              <p className="font-medium text-slate-900">Transformer-XL</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Training Epochs</p>
              <p className="font-medium text-slate-900">1,200</p>
            </div>
          </div>
        </div>

        <UsageMetricsCard />
      </div>

      <div className="card p-0 overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Version History</h3>
          <button
            onClick={() => setShowVersionModal(true)}
            className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Upload New Version
          </button>
        </div>
        
        <VersionHistoryTable
          versions={versions}
          onDeploy={handleDeploy}
          onStop={handleStop}
          onNavigateToTest={() => router.push(`/models/${modelId}/test`)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-indigo-700 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 opacity-20">
            <span className="text-9xl">☁️</span>
          </div>
          <h3 className="font-bold text-xl mb-3 relative z-10">Cloud Infrastructure</h3>
          <p className="text-indigo-100 mb-8 relative z-10 max-w-sm">Optimized for A100 GPU clusters with horizontal autoscaling.</p>
          <div className="bg-indigo-900/50 backdrop-blur rounded border border-indigo-500/30 p-3 font-mono text-sm inline-flex items-center gap-3 relative z-10">
            <span className="text-indigo-300">$</span> deploy --cluster=prod-us-east-1
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-8 text-slate-300 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">Interface Configuration</h3>
            <span className="text-xs font-mono text-slate-500">v{latestVersion ? latestVersion.versionNumber : 1}</span>
          </div>
          <div className="flex-1 overflow-auto space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">Example Payload Input</p>
              <pre className="text-xs font-mono leading-relaxed text-indigo-200 bg-slate-800/50 p-3 rounded border border-slate-800 whitespace-pre-wrap">
                {latestVersion?.examplePayload || "Not provided"}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">Expected Prediction Result</p>
              <pre className="text-xs font-mono leading-relaxed text-indigo-200 bg-slate-800/50 p-3 rounded border border-slate-800 whitespace-pre-wrap">
                {latestVersion?.expectedResult || "Not provided"}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {showVersionModal && (
        <UploadVersionModal
          onClose={() => setShowVersionModal(false)}
          isUploading={isUploading}
          modelFile={modelFile}
          setModelFile={setModelFile}
          scalerFile={scalerFile}
          setScalerFile={setScalerFile}
          preprocessFile={preprocessFile}
          setPreprocessFile={setPreprocessFile}
          postprocessFile={postprocessFile}
          setPostprocessFile={setPostprocessFile}
          examplePayload={examplePayload}
          setExamplePayload={setExamplePayload}
          expectedResult={expectedResult}
          setExpectedResult={setExpectedResult}
          onUpload={handleUploadVersion}
        />
      )}
    </div>
  );
}
