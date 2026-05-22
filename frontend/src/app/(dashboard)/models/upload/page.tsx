"use client";

import React, { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createModel } from "@/lib/actions/models.actions";
import { uploadModelFormSchema, UploadModelFormInput } from "@/lib/schemas";
import { GeneralInfoForm } from "@/components/models/GeneralInfoForm";
import { ArtifactsForm } from "@/components/models/ArtifactsForm";
import { InterfaceConfigForm } from "@/components/models/InterfaceConfigForm";
import { FeatureBadges } from "@/components/models/FeatureBadges";

/**
 * Page component for uploading and creating a new machine learning model.
 * Connects forms for general metadata, file uploads, and JSON configurations
 * to trigger API registries and versions upload requests.
 *
 * @returns The page component rendering the multi-step model creation form.
 */
export default function UploadModelPage() {
  const router = useRouter();

  // Setup validation form handler
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UploadModelFormInput>({
    resolver: zodResolver(uploadModelFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      modelFile: null,
      scalerFile: null,
      preprocessMode: "file",
      preprocessFile: null,
      preprocessCode: "",
      postprocessMode: "file",
      postprocessFile: null,
      postprocessCode: "",
      examplePayload: `{
  "input_data": [
    {
      "features": [
        {
          "name": "transaction_amount",
          "value": 150.25
        },
        {
          "name": "merchant_category",
          "value": "retail"
        }
      ]
    }
  ]
}`,
      expectedResult: `{
  "status": "success",
  "predictions": [
    {
      "class": "legit",
      "probability": 0.985,
      "metadata": {
        "model_version": "v1.2.0",
        "latency_ms": 12
      }
    }
  ]
}`,
    },
  });

  const nameValue = watch("name");
  const modelFileValue = watch("modelFile");

  // Progress and status states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  /**
   * Processes model registration and transfers file packages to backend storage.
   *
   * @param data - The parsed model schemas containing name, description, and files.
   */
  const handleUploadSubmit = async (data: UploadModelFormInput) => {
    const {
      name,
      description,
      modelFile,
      scalerFile,
      preprocessMode,
      preprocessFile,
      preprocessCode,
      postprocessMode,
      postprocessFile,
      postprocessCode,
      examplePayload,
      expectedResult,
    } = data;

    setIsUploading(true);
    setUploadStatus("Initializing model registry entry...");
    setUploadProgress(10);

    try {
      // 1. Create model registry via Server Action
      const createRes = await createModel(name, description || "");
      if (!createRes.success) {
        alert(createRes.error || "Model registry creation failed");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      const modelId = createRes.data.id;

      // 2. Prepare files for version upload
      const formData = new FormData();
      formData.append("model", modelFile);
      if (scalerFile) formData.append("scaler", scalerFile);

      if (preprocessMode === "file" && preprocessFile) {
        formData.append("preprocess", preprocessFile);
      } else if (preprocessMode === "code" && preprocessCode?.trim()) {
        const blob = new Blob([preprocessCode], { type: "text/plain" });
        formData.append("preprocess", blob, "preprocess.py");
      }

      if (postprocessMode === "file" && postprocessFile) {
        formData.append("postprocess", postprocessFile);
      } else if (postprocessMode === "code" && postprocessCode?.trim()) {
        const blob = new Blob([postprocessCode], { type: "text/plain" });
        formData.append("postprocess", blob, "postprocess.py");
      }

      if (examplePayload) formData.append("examplePayload", examplePayload);
      if (expectedResult) formData.append("expectedResult", expectedResult);

      setUploadStatus("Transferring artifacts to remote storage...");

      // 3. Upload version via API Handler proxy using Axios to track progress
      const response = await axios.post(`/api/models/${modelId}/versions`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total);
            setUploadProgress(10 + percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        setUploadStatus("Artifacts queued for containerization!");
        setUploadProgress(100);
        setTimeout(() => {
          router.push(`/models/${modelId}`);
          router.refresh();
        }, 800);
      } else {
        const errorMsg = response.data?.message || "Upload failed";
        alert(errorMsg);
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "An unexpected error occurred.";
      if (axios.isAxiosError(e)) {
        errMsg = e.response?.data?.message || e.message || errMsg;
      } else if (e instanceof Error) {
        errMsg = e.message;
      }
      alert(errMsg);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload Model Artifacts</h1>
        <p className="text-slate-500 mt-1">
          Initialize your production environment by uploading your pre-trained model and support scripts.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleUploadSubmit)} className="space-y-6">
        <GeneralInfoForm register={register} errors={errors} isUploading={isUploading} />

        <ArtifactsForm
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          isUploading={isUploading}
        />

        <InterfaceConfigForm register={register} errors={errors} isUploading={isUploading} />

        {isUploading && (
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-900">{uploadStatus}</span>
              <span className="text-sm font-bold text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">Your artifacts are being pushed to the background worker queue.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Artifacts will be scanned for security and integrity before deployment.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-slate-600 font-medium px-4 hover:text-slate-800 cursor-pointer disabled:opacity-50"
              onClick={() => router.push("/models")}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2.5 px-6 flex items-center gap-2 transition-all cursor-pointer"
              disabled={isUploading || !nameValue || !modelFileValue}
            >
              {isUploading ? "Processing..." : "Submit to Queue"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <FeatureBadges />
    </div>
  );
}
