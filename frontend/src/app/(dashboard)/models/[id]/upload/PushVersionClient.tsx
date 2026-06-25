"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUploadVersion } from "@/hooks/use-upload-version";
import PushVersionForm from "@/components/models/PushVersionForm";
import { FeatureBadges } from "@/components/models/FeatureBadges";
import type { Model } from "@/types";

interface PushVersionClientProps {
  model: Model;
}

/**
 * Client-side presentation layout for the Standalone Push Version page.
 * Mirrored exactly after the UploadModelPage layout.
 */
export default function PushVersionClient({ model }: PushVersionClientProps) {
  const router = useRouter();
  
  const {
    modelFile,
    setModelFile,
    scalerFile,
    setScalerFile,
    preprocessFile,
    setPreprocessFile,
    postprocessFile,
    setPostprocessFile,
    preprocessMode,
    setPreprocessMode,
    preprocessCode,
    setPreprocessCode,
    postprocessMode,
    setPostprocessMode,
    postprocessCode,
    setPostprocessCode,
    examplePayload,
    setExamplePayload,
    expectedResult,
    setExpectedResult,
    isUploading,
    uploadProgress,
    uploadStatus,
    isDetectingSchema,
    handleDetectSchema,
    handleUploadVersion,
  } = useUploadVersion(model.id, model.type);

  const handleCancel = () => {
    router.push(`/models/${model.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500 text-foreground space-y-8">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground font-mono">
          Push Version: {model.name.toLowerCase().replace(/\s+/g, "-")}
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Publish updated weights, normalize scripts, or schemas. Unchanged files will be carried over.
        </p>
      </div>

      {/* Main Interactive Form */}
      <PushVersionForm
        modelId={model.id}
        onCancel={handleCancel}
        modelFile={modelFile}
        setModelFile={setModelFile}
        scalerFile={scalerFile}
        setScalerFile={setScalerFile}
        preprocessFile={preprocessFile}
        setPreprocessFile={setPreprocessFile}
        postprocessFile={postprocessFile}
        setPostprocessFile={setPostprocessFile}
        preprocessMode={preprocessMode}
        setPreprocessMode={setPreprocessMode}
        preprocessCode={preprocessCode}
        setPreprocessCode={setPreprocessCode}
        postprocessMode={postprocessMode}
        setPostprocessMode={setPostprocessMode}
        postprocessCode={postprocessCode}
        setPostprocessCode={setPostprocessCode}
        examplePayload={examplePayload}
        setExamplePayload={setExamplePayload}
        expectedResult={expectedResult}
        setExpectedResult={setExpectedResult}
        onUpload={handleUploadVersion}
        uploadProgress={uploadProgress}
        uploadStatus={uploadStatus}
        isUploading={isUploading}
        isDetectingSchema={isDetectingSchema}
        onDetectSchema={handleDetectSchema}
      />

      {/* Footer Badges */}
      <FeatureBadges />
    </div>
  );
}
