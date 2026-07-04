"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getSession } from "next-auth/react";

import { createModel } from "@/lib/actions/models.actions";
import { uploadModelFormSchema, type UploadModelFormInput } from "@/lib/schemas";
import { detectSchema, initiateVersionUpload, completeVersionUpload, abortVersionUpload } from "@/lib/services/models.service";
import { uploadChunksConcurrently, assertPartsAreContiguous } from "@/lib/utils/multipart-upload.util";
import { LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES } from "@/lib/utils/upload-thresholds";

function mapDetectedAttributes(framework: string, task: string) {
  const fw = (framework || "").toLowerCase();
  const tk = (task || "").toLowerCase();

  let type = "TABULAR";
  let mappedFramework = "CUSTOM";
  let taskType = "OTHER";

  // Map Framework
  if (fw === "sklearn") mappedFramework = "SKLEARN";
  else if (fw === "pytorch") mappedFramework = "PYTORCH";
  else if (fw === "tensorflow") mappedFramework = "TENSORFLOW";
  else if (fw === "onnx") mappedFramework = "ONNX";
  else if (fw === "gguf") mappedFramework = "LLAMA_CPP";
  else if (fw === "diffusers" || fw === "huggingface") mappedFramework = "PYTORCH";

  // Map Model Type & Task Type
  if (tk.includes("llm_gguf") || tk.includes("chat")) {
    type = "LLM_GGUF";
    taskType = "CHAT";
  } else if (tk.includes("diffusion") || tk.includes("text_to_image") || tk.includes("image_to_image")) {
    type = "DIFFUSION";
    taskType = "GENERATION";
  } else if (tk.includes("image") || tk.includes("vision") || tk.includes("detection") || tk.includes("segmentation")) {
    type = "VISION";
    if (tk.includes("detection")) taskType = "OBJECT_DETECTION";
    else if (tk.includes("segmentation")) taskType = "SEGMENTATION";
    else taskType = "CLASSIFICATION";
  } else if (tk.includes("text") || tk.includes("nlp") || tk.includes("generation") || tk.includes("translation")) {
    type = "NLP";
    if (tk.includes("generation")) taskType = "GENERATION";
    else taskType = "CLASSIFICATION";
  } else {
    type = "TABULAR";
    if (tk.includes("regression")) taskType = "REGRESSION";
    else if (tk.includes("classification")) taskType = "CLASSIFICATION";
  }

  return { type, framework: mappedFramework, taskType };
}


/**
 * Custom React hook to coordinate machine learning model upload workflows.
 * Encapsulates form registration states, step-by-step validations, and Axios file uploads tracking.
 *
 * @returns An object containing form controls, stepper progression handlers, and progress statuses.
 */
export function useUploadModel(options?: { successRedirect?: (modelId: string) => string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Upload progress & state hooks
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createdModelId, setCreatedModelId] = useState<string | null>(null);
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);
  const [hasDetected, setHasDetected] = useState(false);

  // Initialize React Hook Form
  const form = useForm<UploadModelFormInput>({
    resolver: zodResolver(uploadModelFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
      type: "TABULAR",
      framework: "CUSTOM",
      taskType: "OTHER",
      isPublic: false,
      modelFile: null,
      scalerFile: null,
      preprocessMode: "file",
      preprocessFile: null,
      preprocessCode: "",
      postprocessMode: "file",
      postprocessFile: null,
      postprocessCode: "",
      examplePayload: "",
      expectedResult: "",
      classLabels: "",
    },
  });

  const { trigger, watch } = form;

  // Watched fields for rendering in UI steps
  const modelFile = watch("modelFile") as File | null;
  const scalerFile = watch("scalerFile") as File | null;
  const preprocessFile = watch("preprocessFile") as File | null;
  const preprocessMode = watch("preprocessMode") || "file";
  const postprocessFile = watch("postprocessFile") as File | null;
  const postprocessMode = watch("postprocessMode") || "file";

  // Watch type, framework, and taskType inside the hook to ensure updates reactively trigger re-render
  const detectedType = watch("type");
  const detectedFramework = watch("framework");
  const detectedTaskType = watch("taskType");

  /**
   * Uploads model artifacts and scripts to the backend in draft mode (triggerBuild=false)
   * and auto-populates the schema templates returned by the Python introspector.
   */
  /**
   * Statelessly analyzes the uploaded model weights file to auto-detect its framework/inputs/outputs
   * and auto-populates the schema templates returned by the Python introspector.
   */
  const analyzeModelSchema = async () => {
    setSubmitError("");
    setIsUploading(true);
    setUploadStatus("Analyzing model weights and detecting schema...");
    setUploadProgress(20);

    try {
      const model = form.getValues("modelFile");
      if (!model) {
        throw new Error("Please upload a model weights file first.");
      }

      setUploadProgress(50);
      const result = await detectSchema(model);
      setUploadProgress(90);

      // Auto-populate examplePayload and expectedResult if detected
      if (result.example_payload) {
        form.setValue("examplePayload", result.example_payload);
      }
      if (result.expected_result) {
        form.setValue("expectedResult", result.expected_result);
      }

      // Map detected attributes
      const { type, framework, taskType } = mapDetectedAttributes(result.framework, result.task);
      form.setValue("type", type);
      form.setValue("framework", framework);
      form.setValue("taskType", taskType);
      setHasDetected(true);

      setUploadStatus("Analysis complete!");
      setUploadProgress(100);

      // Brief timeout before transitioning to Step 3
      setTimeout(() => {
        setIsUploading(false);
        setStep(3);
        setUploadProgress(0);
        setUploadStatus("");
      }, 500);
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "Schema detection failed.";
      if (e instanceof Error) {
        errMsg = e.message;
      }
      setSubmitError(errMsg);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(errMsg);
    }
  };

  /**
   * Validates form parameters for the active step before advancing.
   */
  const handleNextStep = async () => {
    setSubmitError("");
    if (step === 1) {
      const isValid = await trigger(["name", "description"]);
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      const isValid = await trigger(["modelFile"]);
      if (isValid) {
        setStep(3);
      }
    }
  };

  /**
   * Debug helper: logs all current form errors to the console.
   * Called by handleSubmit as the error callback so we can see what is blocking submit.
   */
  const onInvalidSubmit = (errors: Record<string, unknown>) => {
    const cleanErrors = Object.keys(errors).reduce((acc, key) => {
      const err = errors[key] as any;
      if (err) {
        acc[key] = {
          type: err.type,
          message: err.message,
        };
      }
      return acc;
    }, {} as Record<string, any>);
    console.error("[UploadModel] Form validation failed — errors:", cleanErrors);
  };

  /**
   * Finalizes the model creation by registering the model in the database, 
   * uploading the artifacts, saving the schema configs, and starting the build.
   *
   * @param data - The parsed model schema options.
   */  const onSubmit = async (data: UploadModelFormInput) => {
    setSubmitError("");
    setIsUploading(true);
    setUploadStatus("Initializing model registry entry...");
    setUploadProgress(10);

    let modelId: string | null = null;
    let abortableUpload: { objectKey: string; uploadId: string } | null = null;

    try {
      // 1. Create model registry entry
      const isPublicBool = (data.isPublic as unknown) === "true" || data.isPublic === true;
      const createRes = await createModel(
        data.name,
        data.description || "",
        isPublicBool,
        data.type,
        data.framework,
        data.taskType
      );
      if (!createRes.success) {
        throw new Error(createRes.error || "Model registry creation failed.");
      }
      modelId = createRes.data.id;
      setCreatedModelId(modelId);
      setUploadProgress(20);
      setUploadStatus("Initializing upload registry session...");

      // 2. Request presigned URLs from backend
      const initiateRes = await initiateVersionUpload(modelId, {
        modelFilename: data.modelFile!.name,
        modelSize: data.modelFile!.size,
        scalerFilename: data.scalerFile?.name,
        preprocessFilename: data.preprocessMode === "file" && data.preprocessFile ? data.preprocessFile.name : (data.preprocessMode === "code" && data.preprocessCode?.trim() ? "preprocess.py" : undefined),
        postprocessFilename: data.postprocessMode === "file" && data.postprocessFile ? data.postprocessFile.name : (data.postprocessMode === "code" && data.postprocessCode?.trim() ? "postprocess.py" : undefined),
      });

      const { chunkSize, urls: partUrls, uploadId, objectKey } = initiateRes.model;
      abortableUpload = { objectKey, uploadId };

      // 3. Slice file into chunks
      const chunks: Blob[] = [];
      let start = 0;
      while (start < data.modelFile!.size) {
        chunks.push(data.modelFile!.slice(start, start + chunkSize));
        start += chunkSize;
      }

      setUploadProgress(30);
      setUploadStatus("Uploading model weights in chunks...");

      // 4. Upload chunks concurrently
      const parts = await uploadChunksConcurrently(
        chunks,
        partUrls,
        data.modelFile!.size,
        (percent) => setUploadProgress(30 + Math.round(percent * 0.5)), // 50% of total progress
      );
      assertPartsAreContiguous(parts);

      // 5. Upload scaler if needed
      if (initiateRes.scaler && data.scalerFile) {
        setUploadStatus("Uploading scaler artifact...");
        await axios.put(initiateRes.scaler.url, data.scalerFile, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 6. Upload preprocessing if needed
      if (initiateRes.preprocess) {
        setUploadStatus("Uploading preprocessing script...");
        let prepBlob: Blob;
        if (data.preprocessMode === "file" && data.preprocessFile) {
          prepBlob = data.preprocessFile;
        } else {
          prepBlob = new Blob([data.preprocessCode || ""], { type: "text/plain" });
        }
        await axios.put(initiateRes.preprocess.url, prepBlob, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 7. Upload postprocessing if needed
      if (initiateRes.postprocess) {
        setUploadStatus("Uploading postprocessing script...");
        let postBlob: Blob;
        if (data.postprocessMode === "file" && data.postprocessFile) {
          postBlob = data.postprocessFile;
        } else {
          postBlob = new Blob([data.postprocessCode || ""], { type: "text/plain" });
        }
        await axios.put(initiateRes.postprocess.url, postBlob, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }

      // 8. Complete the upload on the backend
      setUploadStatus("Completing upload registry stitching...");
      setUploadProgress(90);

      const completePayload = {
        examplePayload: data.examplePayload || undefined,
        expectedResult: data.expectedResult || undefined,
        classLabels: data.classLabels || undefined,
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

      const version = await completeVersionUpload(modelId, completePayload);
      abortableUpload = null; // Completed successfully — nothing left to abort.
      setCreatedVersionId(version.id);

      setUploadStatus("Model successfully uploaded and queued for compilation!");
      setUploadProgress(100);
      toast.success("Model uploaded and compilation started!");

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
      if (modelId && abortableUpload) {
        try {
          await abortVersionUpload(modelId, abortableUpload.objectKey, abortableUpload.uploadId);
        } catch (abortErr) {
          console.error("Failed to abort orphaned upload session:", abortErr);
        }
      }

      setSubmitError(errMsg);
      toast.error(errMsg);
      setUploadProgress(0);
      setUploadStatus("");
      setIsUploading(false);
    }
  };

  const [isDetectingSchema, setIsDetectingSchema] = useState(false);

  /**
   * Triggers the automated model schema detection using the currently attached model file.
   * On success, updates the form values for examplePayload, expectedResult, and auto-detected enums.
   */
  const handleDetectSchema = async () => {
    const model = form.getValues("modelFile");
    if (!model) {
      toast.error("Please upload a model file first in Step 2.");
      return;
    }

    setIsDetectingSchema(true);
    try {
      const result = await detectSchema(model);
      
      // Update form values
      if (result.example_payload) {
        form.setValue("examplePayload", result.example_payload);
      }
      if (result.expected_result) {
        form.setValue("expectedResult", result.expected_result);
      }

      // Map detected attributes
      const { type, framework, taskType } = mapDetectedAttributes(result.framework, result.task);
      form.setValue("type", type);
      form.setValue("framework", framework);
      form.setValue("taskType", taskType);
      
      setHasDetected(true);
      toast.success("Model schema and configuration auto-detected successfully!");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Schema detection: ${errMsg}`);
      if (model.size > LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES) {
        toast.success("Proceeding with background schema auto-detection during compilation.");
        // Mark as detected to allow stepping forward in wizard
        setHasDetected(true);
      }
    } finally {
      setIsDetectingSchema(false);
    }
  };

  return {
    form,
    step,
    setStep,
    isUploading,
    uploadProgress,
    uploadStatus,
    submitError,
    setSubmitError,
    modelFile,
    scalerFile,
    preprocessFile,
    preprocessMode,
    postprocessFile,
    postprocessMode,
    handleNextStep,
    onSubmit,
    onInvalidSubmit,
    isDetectingSchema,
    handleDetectSchema,
    hasDetected,
    detectedType,
    detectedFramework,
    detectedTaskType,
  };
}
