"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getSession } from "next-auth/react";
import { detectSchema } from "@/lib/services/models.service";

/**
 * Custom React hook to coordinate model version uploads.
 * Manages form states, script code text overrides, automated schema detection,
 * and Axios multipart uploads tracking.
 *
 * @param modelId - The unique UUID identifier of the parent model.
 * @returns An object containing form variables, progress trackers, and event handlers.
 */
export function useUploadVersion(modelId: string, modelType?: string) {
  const router = useRouter();

  // File Upload states
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [scalerFile, setScalerFile] = useState<File | null>(null);
  const [preprocessFile, setPreprocessFile] = useState<File | null>(null);
  const [postprocessFile, setPostprocessFile] = useState<File | null>(null);

  // Script Mode toggles ("file" | "code") & textareas
  const [preprocessMode, setPreprocessMode] = useState<"file" | "code">("file");
  const [preprocessCode, setPreprocessCode] = useState("");
  const [postprocessMode, setPostprocessMode] = useState<"file" | "code">("file");
  const [postprocessCode, setPostprocessCode] = useState("");

  // Interface Configuration templates
  const [examplePayload, setExamplePayload] = useState("");
  const [expectedResult, setExpectedResult] = useState("");

  // Loading & Progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDetectingSchema, setIsDetectingSchema] = useState(false);

  /**
   * Statelessly analyzes the attached model file to auto-detect schema configurations.
   */
  const handleDetectSchema = async () => {
    if (!modelFile) {
      toast.error("Please select a model weights file first.");
      return;
    }

    setIsDetectingSchema(true);
    try {
      const result = await detectSchema(modelFile, modelType);
      if (result.example_payload) {
        setExamplePayload(result.example_payload);
      }
      if (result.expected_result) {
        setExpectedResult(result.expected_result);
      }
      toast.success("Model schema detected and loaded successfully!");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Schema detection failed: ${errMsg}`);
    } finally {
      setIsDetectingSchema(false);
    }
  };

  /**
   * Gathers all state files and fields, packages them into FormData,
   * uploads them to the server with progress tracking, and redirects back.
   */
  const handleUploadVersion = async () => {
    setIsUploading(true);
    setUploadStatus("Preparing version packaging...");
    setUploadProgress(10);

    try {
      const formData = new FormData();
      if (modelFile) formData.append("model", modelFile);
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
      formData.append("triggerBuild", "true");

      setUploadStatus("Uploading artifacts to registry...");
      setUploadProgress(20);

      const session = await getSession();
      const token = session?.accessToken;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(`${backendUrl}/api/v1/models/${modelId}/versions`, formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total);
            setUploadProgress(20 + percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        setUploadStatus("Version successfully pushed and queued for build!");
        setUploadProgress(100);
        toast.success("New version uploaded and compilation started!");

        setTimeout(() => {
          router.push(`/models/${modelId}`);
          router.refresh();
        }, 800);
      } else {
        const errorMsg = response.data?.message || "Upload failed";
        throw new Error(errorMsg);
      }
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "An error occurred during submission.";
      if (axios.isAxiosError(e)) {
        errMsg = e.response?.data?.message || e.message || errMsg;
      } else if (e instanceof Error) {
        errMsg = e.message;
      }
      toast.error(errMsg);
      setUploadProgress(0);
      setUploadStatus("");
      setIsUploading(false);
    }
  };

  return {
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
  };
}
