"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";

import { createModel } from "@/lib/actions/models.actions";
import { uploadModelFormSchema, type UploadModelFormInput } from "@/lib/schemas";
import { detectSchema } from "@/lib/services/models.service";


/**
 * Custom React hook to coordinate machine learning model upload workflows.
 * Encapsulates form registration states, step-by-step validations, and Axios file uploads tracking.
 *
 * @returns An object containing form controls, stepper progression handlers, and progress statuses.
 */
export function useUploadModel() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Upload progress & state hooks
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [createdModelId, setCreatedModelId] = useState<string | null>(null);
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);

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

  const { trigger, watch } = form;

  // Watched fields for rendering in UI steps
  const modelFile = watch("modelFile") as File | null;
  const scalerFile = watch("scalerFile") as File | null;
  const preprocessFile = watch("preprocessFile") as File | null;
  const preprocessMode = watch("preprocessMode") || "file";
  const postprocessFile = watch("postprocessFile") as File | null;
  const postprocessMode = watch("postprocessMode") || "file";

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
        await analyzeModelSchema();
      }
    }
  };

  /**
   * Debug helper: logs all current form errors to the console.
   * Called by handleSubmit as the error callback so we can see what is blocking submit.
   */
  const onInvalidSubmit = (errors: Record<string, unknown>) => {
    console.error("[UploadModel] Form validation failed — errors:", JSON.stringify(errors, null, 2));
  };

  /**
   * Finalizes the model creation by registering the model in the database, 
   * uploading the artifacts, saving the schema configs, and starting the build.
   *
   * @param data - The parsed model schema options.
   */
  const onSubmit = async (data: UploadModelFormInput) => {
    setSubmitError("");
    setIsUploading(true);
    setUploadStatus("Initializing model registry entry...");
    setUploadProgress(10);

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
      const modelId = createRes.data.id;
      setCreatedModelId(modelId);
      setUploadProgress(30);
      setUploadStatus("Uploading artifacts & starting compilation...");

      // 2. Prepare payload files for version upload
      const formData = new FormData();
      formData.append("model", data.modelFile!);
      if (data.scalerFile) formData.append("scaler", data.scalerFile);

      if (data.preprocessMode === "file" && data.preprocessFile) {
        formData.append("preprocess", data.preprocessFile);
      } else if (data.preprocessMode === "code" && data.preprocessCode?.trim()) {
        const blob = new Blob([data.preprocessCode], { type: "text/plain" });
        formData.append("preprocess", blob, "preprocess.py");
      }

      if (data.postprocessMode === "file" && data.postprocessFile) {
        formData.append("postprocess", data.postprocessFile);
      } else if (data.postprocessMode === "code" && data.postprocessCode?.trim()) {
        const blob = new Blob([data.postprocessCode], { type: "text/plain" });
        formData.append("postprocess", blob, "postprocess.py");
      }

      // Add schema configuration and trigger build flag
      formData.append("examplePayload", data.examplePayload || "");
      formData.append("expectedResult", data.expectedResult || "");
      formData.append("triggerBuild", "true");

      // 3. Upload version files using Axios to track progress
      const response = await axios.post(`/api/models/${modelId}/versions`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 60) / progressEvent.total);
            setUploadProgress(30 + percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        const version = response.data;
        setCreatedVersionId(version.id);

        setUploadStatus("Model successfully uploaded and queued for compilation!");
        setUploadProgress(100);
        toast.success("Model uploaded and compilation started!");

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
      let errMsg = "An unexpected error occurred during final submission.";
      if (axios.isAxiosError(e)) {
        errMsg = e.response?.data?.message || e.message || errMsg;
      } else if (e instanceof Error) {
        errMsg = e.message;
      }
      setSubmitError(errMsg);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(errMsg);
    }
  };

  const [isDetectingSchema, setIsDetectingSchema] = useState(false);

  /**
   * Triggers the automated model schema detection using the currently attached model file.
   * On success, updates the form values for examplePayload and expectedResult.
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
      
      toast.success("Model schema detected and loaded successfully!");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(`Schema detection failed: ${errMsg}`);
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
  };
}
