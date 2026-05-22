import { User } from "../user";

export interface Deployment {
  id: string;
  containerId?: string;
  url?: string;
  port?: number;
  status: 'starting' | 'running' | 'stopped' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  versionNumber: number;
  status: 'uploaded' | 'building' | 'ready' | 'failed';
  modelFilePath: string;
  scalerFilePath?: string;
  preprocessFilePath?: string;
  postprocessFilePath?: string;
  examplePayload?: string;
  expectedResult?: string;
  errorMessage?: string;
  deployments?: Deployment[];
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  user?: User;
  versions?: ModelVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  time: string;
  reqId: string;
  status: "SUCCESS" | "FAILED";
  latency: string;
  outcome: string;
  payload: string;
  response: string;
  confidence?: string;
  memory?: string;
}

