import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { deployVersion, stopDeployment } from "@/lib/actions/deployments.actions";
import { rebuildModelVersion, deleteModel } from "@/lib/actions/models.actions";
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



  /**
   * Initiates deployment server requests for a chosen version ID.
   *
   * @param versionId - Target model version to run.
   */
  const handleDeploy = async (versionId: string) => {
    try {
      const res = await deployVersion(versionId, modelId);
      if (res.success) {
        toast.success("Deployment started!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to start deployment");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start deployment");
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
        toast.success("Deployment stopped!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to stop deployment");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to stop deployment");
    }
  };

  /**
   * Re-triggers the container build process for a failed model version.
   *
   * @param versionId - Unique database identifier of the model version.
   */
  const handleRebuild = async (versionId: string) => {
    try {
      const res = await rebuildModelVersion(modelId, versionId);
      if (res.success) {
        toast.success("Rebuild started!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to start rebuild");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start rebuild");
    }
  };



  /**
   * Deletes this model repository. Confirmation is the caller's
   * responsibility (see the Danger Zone card's ConfirmDialog).
   * Refreshes dashboard navigation on success.
   */
  const handleDeleteModel = async () => {
    try {
      const res = await deleteModel(modelId);
      if (res.success) {
        toast.success("Model deleted successfully.");
        router.push("/models");
      } else {
        toast.error(res.error || "Failed to delete model");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete model");
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
    handleDeploy,
    handleStop,
    handleRebuild,
    handleDeleteModel,
  };
}
