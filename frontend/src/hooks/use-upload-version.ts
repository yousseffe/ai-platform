"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getSession } from "next-auth/react";
import { detectSchema, initiateVersionUpload, completeVersionUpload, abortVersionUpload } from "@/lib/services/models.service";
import { uploadChunksConcurrently, assertPartsAreContiguous } from "@/lib/utils/multipart-upload.util";
import { LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES } from "@/lib/utils/upload-thresholds";

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
      toast.error(`Schema detection: ${errMsg}`);
      if (modelFile.size > LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES) {
        toast.success("Proceeding with background schema auto-detection during compilation.");
      }
    } finally {
      setIsDetectingSchema(false);
    }
  };

  /**
   * Gathers all state files and fields, packages them into FormData,
   * uploads them to the server with progress tracking, and redirects back.
   */
  const handleUploadVersion = async () => {
    if (!modelFile) {
      toast.error("Please upload a model weights file first.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Initializing upload registry session...");
    setUploadProgress(5);

    let abortableUpload: { objectKey: string; uploadId: string } | null = null;

    try {
      // 1. Request presigned URLs from backend
      const initiateRes = await initiateVersionUpload(modelId, {
        modelFilename: modelFile.name,
        modelSize: modelFile.size,
        scalerFilename: scalerFile?.name,
        preprocessFilename: preprocessMode === "file" && preprocessFile ? preprocessFile.name : (preprocessMode === "code" && preprocessCode?.trim() ? "preprocess.py" : undefined),
        postprocessFilename: postprocessMode === "file" && postprocessFile ? postprocessFile.name : (postprocessMode === "code" && postprocessCode?.trim() ? "postprocess.py" : undefined),
      });

      const { chunkSize, urls: partUrls, uploadId, objectKey } = initiateRes.model;
      abortableUpload = { objectKey, uploadId };

      // 2. Slice file into chunks
      const chunks: Blob[] = [];
      let start = 0;
      while (start < modelFile.size) {
        chunks.push(modelFile.slice(start, start + chunkSize));
        start += chunkSize;
      }

      setUploadProgress(10);
      setUploadStatus("Uploading model weights in chunks...");

      // 3. Upload chunks concurrently
      const parts = await uploadChunksConcurrently(
        chunks,
        partUrls,
        modelFile.size,
        (percent) => setUploadProgress(10 + Math.round(percent * 0.7)), // 70% of total progress
      );
      assertPartsAreContiguous(parts);

      // 4. Upload scaler if needed
      if (initiateRes.scaler && scalerFile) {
        setUploadStatus("Uploading scaler artifact...");
        await axios.put(initiateRes.scaler.url, scalerFile, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 5. Upload preprocessing if needed
      if (initiateRes.preprocess) {
        setUploadStatus("Uploading preprocessing script...");
        let prepBlob: Blob;
        if (preprocessMode === "file" && preprocessFile) {
          prepBlob = preprocessFile;
        } else {
          prepBlob = new Blob([preprocessCode], { type: "text/plain" });
        }
        await axios.put(initiateRes.preprocess.url, prepBlob, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 6. Upload postprocessing if needed
      if (initiateRes.postprocess) {
        setUploadStatus("Uploading postprocessing script...");
        let postBlob: Blob;
        if (postprocessMode === "file" && postprocessFile) {
          postBlob = postprocessFile;
        } else {
          postBlob = new Blob([postprocessCode], { type: "text/plain" });
        }
        await axios.put(initiateRes.postprocess.url, postBlob, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 7. Complete the upload on the backend
      setUploadStatus("Completing upload registry stitching...");
      setUploadProgress(90);

      const completePayload = {
        examplePayload: examplePayload || undefined,
        expectedResult: expectedResult || undefined,
        triggerBuild: "true",
        model: {
          objectKey,
          uploadId,
          parts,
        },
        scaler: initiateRes.scaler ? { objectKey: initiateRes.scaler.objectKey } : undefined,
        preprocess: initiateRes.preprocess ? { objectKey: initiateRes.preprocess.objectKey } : undefined,
        postprocess: initiateRes.postprocess ? { objectKey: initiateRes.postprocess.objectKey } : undefined,
      };

      await completeVersionUpload(modelId, completePayload);
      abortableUpload = null; // Completed successfully — nothing left to abort.

      setUploadStatus("Version successfully pushed and queued for build!");
      setUploadProgress(100);
      toast.success("New version uploaded and compilation started!");

      setTimeout(() => {
        router.push(`/models/${modelId}`);
        router.refresh();
      }, 800);

    } catch (e: unknown) {
      console.error(e);
      let errMsg = "An error occurred during submission.";
      if (axios.isAxiosError(e)) {
        errMsg = e.response?.data?.message || e.message || errMsg;
      } else if (e instanceof Error) {
        errMsg = e.message;
      }

      // Best-effort cleanup of the orphaned multipart upload session. Never let
      // an abort failure mask the original error being surfaced to the user.
      if (abortableUpload) {
        try {
          await abortVersionUpload(modelId, abortableUpload.objectKey, abortableUpload.uploadId);
        } catch (abortErr) {
          console.error("Failed to abort orphaned upload session:", abortErr);
        }
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
