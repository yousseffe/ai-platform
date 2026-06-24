import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deployVersion, stopDeployment } from "@/lib/actions/deployments.actions";
import { deleteModel } from "@/lib/actions/models.actions";
import { Model, ModelVersion, Deployment, DeploymentStatus, VersionStatus } from "@/types";

/**
 * Custom hook to manage the state and operations for the Model Details view.
 * Handles deployment controls, new version uploads, form states, and status polling.
 *
 * @param modelId - The unique database ID of the model.
 * @param initialModel - The initial model configuration fetched on the server.
 * @returns An object containing form states, loading status, action handlers, and upload functions.
 */
export function useModelDetails(modelId: string, initialModel: Model) {
  const router = useRouter();
  const model = initialModel;

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

  /**
   * Triggers the deletion of this model repository.
   * Refreshes dashboard navigation on success.
   */
  const handleDeleteModel = async () => {
    if (!confirm(`Are you sure you want to delete the model "${model.name}"? This action is irreversible.`)) {
      return;
    }
    try {
      const res = await deleteModel(modelId);
      if (res.success) {
        alert("Model deleted successfully.");
        router.push("/models");
      } else {
        alert(res.error || "Failed to delete model");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete model");
    }
  };

  /**
   * Helper function to check if a model version is in a transient state.
   * A version is transient if it is currently uploading, building,
   * or has a running deployment starting up.
   *
   * @param v - The model version to check.
   * @returns True if the version is in a transient/pending state.
   */
  const isVersionTransient = (v: ModelVersion): boolean => {
    if (v.status === VersionStatus.UPLOADED || v.status === VersionStatus.BUILDING) {
      return true;
    }

    const latestDeployment =
      v.deployments && v.deployments.length > 0
        ? [...v.deployments].sort(
            (a: Deployment, b: Deployment) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
        : null;

    if (latestDeployment) {
      if (latestDeployment.status === DeploymentStatus.STARTING) {
        return true;
      }
    }

    return false;
  };

  // Poll deployment and build status every 3 seconds if transient states exist
  useEffect(() => {
    const versions = model.versions || [];
    const hasTransient = versions.some(isVersionTransient);
    if (!hasTransient) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [model.versions, router]);

  const versions = model.versions || [];
  const latestVersion = versions.length
    ? [...versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0]
    : null;

  return {
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
    handleDeleteModel,
  };
}
