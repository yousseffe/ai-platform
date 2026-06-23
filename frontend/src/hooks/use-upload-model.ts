"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";

import { createModel } from "@/lib/actions/models.actions";
import { uploadModelFormSchema, type UploadModelFormInput } from "@/lib/schemas";

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

  // Initialize React Hook Form
  const form = useForm<UploadModelFormInput>({
    resolver: zodResolver(uploadModelFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
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
    console.error("[UploadModel] Form validation failed — errors:", JSON.stringify(errors, null, 2));
  };

  /**
   * Registers a model and transfers the build files packages to backend storage.
   *
   * @param data - The parsed model schema options.
   */
  const onSubmit = async (data: UploadModelFormInput) => {
    setSubmitError("");
    setIsUploading(true);
    setUploadStatus("Initializing model registry entry...");
    setUploadProgress(10);

    try {
      // 1. Create model registry entry via Server Action
      const createRes = await createModel(data.name, data.description || "", data.isPublic || false);
      if (!createRes.success) {
        setSubmitError(createRes.error || "Model registry creation failed.");
        setIsUploading(false);
        setUploadProgress(0);
        toast.error("Failed to initialize model registry.");
        return;
      }

      const modelId = createRes.data.id;

      // 2. Prepare payload files for version upload
      const formData = new FormData();
      formData.append("model", data.modelFile);
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

      if (data.examplePayload) formData.append("examplePayload", data.examplePayload);
      if (data.expectedResult) formData.append("expectedResult", data.expectedResult);

      setUploadStatus("Transferring artifacts to remote storage...");

      // 3. Upload version files using Axios to track binary upload progress
      const response = await axios.post(`/api/models/${modelId}/versions`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total);
            setUploadProgress(10 + percentCompleted);
          }
        },
      });

      if (response.status >= 200 && response.status < 300) {
        setUploadStatus("Artifacts successfully queued for compilation!");
        setUploadProgress(100);
        toast.success("Model uploaded successfully!");
        setTimeout(() => {
          router.push(`/models/${modelId}`);
          router.refresh();
        }, 800);
      } else {
        const errorMsg = response.data?.message || "Upload failed";
        setSubmitError(errorMsg);
        setIsUploading(false);
        setUploadProgress(0);
        toast.error("Upload failed.");
      }
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "An unexpected error occurred.";
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
  };
}
