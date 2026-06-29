import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelsService } from './models.service';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelType } from '../enums/model-type.enum';
import { VersionStatus } from '../enums/version-status.enum';

/**
 * A consumer-facing description of how to call a deployed model's prediction API.
 * Contains only the *format* of authentication — never a live key.
 */
export interface ModelIntegrationSpec {
  model: {
    id: string;
    name: string;
    type: string;
    framework: string;
    taskType: string;
    description: string | null;
    isPublic: boolean;
  };
  endpoint: {
    method: 'POST';
    url: string;
    apiStyle: 'openai-chat' | 'json-predict';
  };
  authentication: {
    type: 'bearer';
    headerFormat: string;
    keyPrefix: string;
    note: string;
  };
  request: {
    contentType: 'application/json';
    example: unknown | null;
    exampleRaw: string | null;
  };
  response: {
    contentType: 'application/json';
    example: unknown | null;
    exampleRaw: string | null;
  };
  classLabels: Record<string, any> | null;
  pricing: {
    creditsPerRequest: number;
    currency: 'CREDITS';
  };
  notes: string[];
}

/**
 * Assembles a deterministic, consumer-facing integration spec for a model from
 * existing registry data. The MCP server exposes this so external agents can wire
 * a platform model into a user's project; this service neither generates code nor
 * returns secrets.
 */
@Injectable()
export class ModelIntegrationService {
  constructor(private readonly modelsService: ModelsService) {}

  /**
   * Builds the {@link ModelIntegrationSpec} for a model the actor may access.
   *
   * @param modelId - Target model UUID.
   * @param actorId - The authenticated actor (for access control), if any.
   * @returns The assembled integration spec.
   * @throws {NotFoundException} If the model has no built/ready version to call.
   */
  async getIntegrationSpec(
    modelId: string,
    actorId?: string,
  ): Promise<ModelIntegrationSpec> {
    const model = actorId
      ? await this.modelsService.getModel(modelId, actorId)
      : await this.modelsService.getPublicModel(modelId);

    const version = this.pickReferenceVersion(model.versions ?? []);
    if (!version) {
      throw new NotFoundException(
        'Model has no ready version with an integration sample yet',
      );
    }

    const baseUrl = (
      process.env.PUBLIC_API_URL ??
      process.env.BACKEND_PUBLIC_URL ??
      'http://localhost:5000'
    ).replace(/\/$/, '');
    const isLlm = model.type === ModelType.LLM_GGUF;

    return {
      model: {
        id: model.id,
        name: model.name,
        type: model.type,
        framework: model.framework,
        taskType: model.taskType,
        description: model.description,
        isPublic: model.isPublic,
      },
      endpoint: {
        method: 'POST',
        url: `${baseUrl}/api/v1/models/${model.id}/predict`,
        apiStyle: isLlm ? 'openai-chat' : 'json-predict',
      },
      authentication: {
        type: 'bearer',
        headerFormat: 'Authorization: Bearer <YOUR_MODEL_API_KEY>',
        keyPrefix: 'ml_sk_live_',
        note: 'Generate a model-scoped live API key from the platform. Load it from an environment variable; never hardcode it.',
      },
      request: this.parseSample(version.examplePayload),
      response: this.parseSample(version.expectedResult),
      classLabels: version.classLabels || null,
      pricing: {
        creditsPerRequest: Number(model.costPerRequest) || 0,
        currency: 'CREDITS',
      },
      notes: this.buildNotes(isLlm),
    };
  }

  /**
   * Selects the highest-numbered READY version that carries an integration
   * sample, falling back to the highest READY version overall.
   */
  private pickReferenceVersion(versions: ModelVersion[]): ModelVersion | null {
    const ready = versions
      .filter((v) => v.status === VersionStatus.READY)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    const withSample = ready.find(
      (v) => v.examplePayload || v.expectedResult,
    );
    return withSample ?? ready[0] ?? null;
  }

  /**
   * Parses a stored JSON sample string into structured form, preserving the raw
   * text when it is not valid JSON.
   */
  private parseSample(raw: string | null): {
    contentType: 'application/json';
    example: unknown | null;
    exampleRaw: string | null;
  } {
    if (!raw) {
      return { contentType: 'application/json', example: null, exampleRaw: null };
    }
    try {
      return {
        contentType: 'application/json',
        example: JSON.parse(raw) as unknown,
        exampleRaw: null,
      };
    } catch {
      return { contentType: 'application/json', example: null, exampleRaw: raw };
    }
  }

  /**
   * Returns deterministic, model-style-specific integration guidance notes.
   */
  private buildNotes(isLlm: boolean): string[] {
    const notes = [
      'Send requests with header "Content-Type: application/json".',
      'The model auto-deploys on first call; the initial request may take longer while the container starts.',
      'Each successful prediction debits the configured credits from the caller wallet.',
    ];
    if (isLlm) {
      notes.push(
        'This is an OpenAI-compatible chat model: POST an OpenAI chat-completions style body to the predict URL.',
      );
    }
    return notes;
  }
}
