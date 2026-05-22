"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { deployVersion, stopDeployment } from "@/lib/actions/deployments.actions";
import type { Model, ModelVersion } from "@/types";
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
 * representing stats and historical artifact version tables.
 *
 * @param props - ModelDetailsClient component properties.
 * @returns The React component layout rendering model version grids.
 */
export default function ModelDetailsClient({ initialModel, modelId }: ModelDetailsClientProps) {
  const router = useRouter();
  const model = initialModel; // Synchronized directly from Server Component via router.refresh()

  // New Version Modal states
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [scalerFile, setScalerFile] = useState<File | null>(null);
  const [preprocessFile, setPreprocessFile] = useState<File | null>(null);
  const [postprocessFile, setPostprocessFile] = useState<File | null>(null);
  const [examplePayload, setExamplePayload] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Initiates deployment server requests for a chosen version ID.
   *
   * @param versionId - Target model version to run.
   */
  const handleDeploy = async (versionId: string) => {
    try {
      const res = await deployVersion(versionId, modelId);
      if (res.success) {
        alert("Deployment started!");
        router.refresh();
      } else {
        alert(res.error || "Failed to start deployment");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to start deployment");
    }
  };

  /**
   * Terminates active model instance execution workloads.
   *
   * @param deploymentId - Unique container runtime deployment database identifier.
   */
  const handleStop = async (deploymentId: string) => {
    try {
      const res = await stopDeployment(deploymentId, modelId);
      if (res.success) {
        alert("Deployment stopped!");
        router.refresh();
      } else {
        alert(res.error || "Failed to stop deployment");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to stop deployment");
    }
  };

  /**
   * Packs artifacts into FormData packages and posts new model versions to backend endpoints.
   */
  const handleUploadVersion = async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (modelFile) formData.append("model", modelFile);
      if (scalerFile) formData.append("scaler", scalerFile);
      if (preprocessFile) formData.append("preprocess", preprocessFile);
      if (postprocessFile) formData.append("postprocess", postprocessFile);
      if (examplePayload) formData.append("examplePayload", examplePayload);
      if (expectedResult) formData.append("expectedResult", expectedResult);

      const res = await fetch(`/api/models/${modelId}/versions`, {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || "Failed to upload version");
      }

      setShowVersionModal(false);
      setModelFile(null);
      setScalerFile(null);
      setPreprocessFile(null);
      setPostprocessFile(null);
      setExamplePayload("");
      setExpectedResult("");
      alert("New version queued for build!");
      router.refresh();
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : "Failed to upload new version";
      alert(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Get active version details to render payload expectations
  const versions = model.versions || [];
  const latestVersion = versions.length
    ? [...versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0]
    : null;

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
