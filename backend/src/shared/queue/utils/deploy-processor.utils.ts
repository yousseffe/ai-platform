import { OwnerType } from '../../enums/owner-type.enum';

export interface DockerDeploymentParams {
  id: string;
  modelVersion: {
    id: string;
    model: {
      id: string;
      name: string;
      type: string;
    };
  };
}

export function buildDockerContainerOptions(params: {
  deployment: DockerDeploymentParams;
  containerName: string;
  imageName: string;
  hostPort: number;
  containerPort: string;
  newModelRamMb: number;
  ownerApiKey: string;
  ownerId: string;
  isLlm: boolean;
  hasRelocatedWeights: boolean;
}): Record<string, unknown> {
  const hostConfig: Record<string, unknown> = {
    PortBindings: {
      [params.containerPort]: [{ HostPort: String(params.hostPort) }],
    },
    RestartPolicy: { Name: 'unless-stopped' },
  };

  if (process.env.MODEL_SANDBOX_HARDENING_ENABLED !== 'false') {
    hostConfig.CapDrop = ['ALL'];
    hostConfig.SecurityOpt = ['no-new-privileges'];
    hostConfig.PidsLimit = 256;
    hostConfig.ReadonlyRootfs = true;
    hostConfig.Tmpfs = {
      '/tmp': 'size=128m',
      '/root/.cache': 'size=256m',
      '/root/.config': 'size=16m',
    };
  }

  if (!params.isLlm) {
    hostConfig.Memory = params.newModelRamMb * 1024 * 1024;
    if (params.hasRelocatedWeights) {
      hostConfig.Binds = [`ai-platform_model_weights:/weights:ro`];
    }
  } else {
    hostConfig.Binds = [`ai-platform_llm_models:/models:ro`];
  }

  const containerOptions: Record<string, unknown> = {
    name: params.containerName,
    Image: params.imageName,
    ExposedPorts: {
      [params.containerPort]: {},
    },
    Env: [
      `API_KEY=${params.ownerApiKey}`,
      `MODEL_ID=${params.deployment.modelVersion.model.id}`,
      `VERSION_ID=${params.deployment.modelVersion.id}`,
      `USER_ID=${params.ownerId}`,
      `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`,
      `OTEL_SERVICE_NAME=model-${params.deployment.modelVersion.model.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
    ],
    HostConfig: hostConfig,
  };

  if (params.isLlm) {
    containerOptions.Entrypoint = [
      '/app/llama-server',
      '-m',
      `/models/${params.deployment.modelVersion.id}.gguf`,
      '--port',
      '8080',
      '--host',
      '0.0.0.0',
      '-np',
      '2',
      '-c',
      '4096',
    ];
  }

  return containerOptions;
}
