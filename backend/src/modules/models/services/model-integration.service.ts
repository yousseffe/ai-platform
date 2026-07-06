import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelsService } from './models.service';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelType } from '../enums/model-type.enum';
import { VersionStatus } from '../enums/version-status.enum';
import { BillingUnit, getBillingUnit } from '../enums/billing-unit.enum';
import { SystemConfig } from '../../wallets/entities/system-config.entity';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

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
    averageRating: number;
    reviewCount: number;
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
    example: JsonValue;
    exampleRaw: string | null;
  };
  response: {
    contentType: 'application/json';
    example: JsonValue;
    exampleRaw: string | null;
  };
  classLabels: Record<string, any> | null;
  pricing: {
    billingUnit: BillingUnit;
    currency: 'CREDITS';
    /** Credits per 1M input tokens — present only for LLM_GGUF models. */
    inputCreditsPerMToken?: number;
    /** Credits per 1M output tokens — present only for LLM_GGUF models. */
    outputCreditsPerMToken?: number;
    /** Credits per request/prediction — present for non-LLM models. */
    creditsPerRequest?: number;
    note: string;
  };
  notes: string[];
  openapi: OpenApiDocument;
}

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{ url: string }>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
}

/**
 * Assembles a deterministic, consumer-facing integration spec for a model from
 * existing registry data. The MCP server exposes this so external agents can wire
 * a platform model into a user's project; this service neither generates code nor
 * returns secrets.
 */
@Injectable()
export class ModelIntegrationService {
  constructor(
    private readonly modelsService: ModelsService,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

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
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const isLlm = model.type === ModelType.LLM_GGUF;

    const specWithoutOpenApi: Omit<ModelIntegrationSpec, 'openapi'> = {
      model: {
        id: model.id,
        name: model.name,
        type: model.type,
        framework: model.framework,
        taskType: model.taskType,
        description: model.description,
        isPublic: model.isPublic,
        averageRating: Number(model.averageRating ?? 0.0),
        reviewCount: Number(model.reviewCount ?? 0),
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
      pricing: await this.buildPricingSpec(model),
      notes: this.buildNotes(isLlm),
    };

    return {
      ...specWithoutOpenApi,
      openapi: this.buildOpenApiDocument(specWithoutOpenApi),
    };
  }

  async getOpenApiDocument(
    modelId: string,
    actorId?: string,
  ): Promise<OpenApiDocument> {
    const spec = await this.getIntegrationSpec(modelId, actorId);
    return spec.openapi;
  }

  /**
   * Selects the highest-numbered READY version that carries an integration
   * sample, falling back to the highest READY version overall.
   */
  private pickReferenceVersion(versions: ModelVersion[]): ModelVersion | null {
    const ready = versions
      .filter((v) => v.status === VersionStatus.READY)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    const withSample = ready.find((v) => v.examplePayload || v.expectedResult);
    return withSample ?? ready[0] ?? null;
  }

  /**
   * Parses a stored JSON sample string into structured form, preserving the raw
   * text when it is not valid JSON.
   */
  private parseSample(raw: string | null): {
    contentType: 'application/json';
    example: JsonValue;
    exampleRaw: string | null;
  } {
    if (!raw) {
      return {
        contentType: 'application/json',
        example: null,
        exampleRaw: null,
      };
    }
    try {
      return {
        contentType: 'application/json',
        example: JSON.parse(raw) as JsonValue,
        exampleRaw: null,
      };
    } catch {
      return {
        contentType: 'application/json',
        example: null,
        exampleRaw: raw,
      };
    }
  }

  private buildOpenApiDocument(
    spec: Omit<ModelIntegrationSpec, 'openapi'>,
  ): OpenApiDocument {
    const endpointUrl = new URL(spec.endpoint.url);
    const serverUrl = `${endpointUrl.protocol}//${endpointUrl.host}`;
    const requestExample = this.ensureOpenApiRequestExample(
      spec.request.example,
      spec.request.exampleRaw,
      spec.endpoint.apiStyle,
    );
    const responseExample = this.ensureOpenApiResponseExample(
      spec.response.example,
      spec.response.exampleRaw,
    );

    return {
      openapi: '3.1.0',
      info: {
        title: `${spec.model.name} Prediction API`,
        version: '1.0.0',
        description:
          spec.model.description ??
          `OpenAPI documentation for invoking ${spec.model.name} through the prediction API.`,
      },
      servers: [{ url: serverUrl }],
      paths: {
        [endpointUrl.pathname]: {
          post: {
            summary: `Run prediction with ${spec.model.name}`,
            operationId: `predict_${spec.model.id.replace(/-/g, '_')}`,
            tags: [spec.model.type, spec.model.taskType],
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema:
                    spec.endpoint.apiStyle === 'openai-chat'
                      ? { $ref: '#/components/schemas/OpenAIChatRequest' }
                      : { $ref: '#/components/schemas/PredictionRequest' },
                  example: requestExample,
                },
              },
            },
            responses: {
              '200': {
                description: 'Prediction result returned by the model.',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/PredictionResponse' },
                    example: responseExample,
                  },
                },
              },
              '401': {
                description: 'Missing, invalid, or revoked API key.',
              },
              '403': {
                description:
                  'The API key is not allowed to call this model or workspace.',
              },
              '404': {
                description: 'Model or ready deployment could not be found.',
              },
              '429': {
                description: 'Rate limit or spend limit exceeded.',
              },
              '500': {
                description: 'Prediction failed inside the model container.',
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API key',
            description: spec.authentication.headerFormat,
          },
        },
        schemas: {
          PredictionRequest: {
            type: 'object',
            additionalProperties: true,
            description:
              'JSON payload accepted by this model. Shape is inferred from the latest ready version sample when available.',
          },
          OpenAIChatRequest: {
            type: 'object',
            required: ['messages'],
            properties: {
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['role', 'content'],
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                    },
                    content: { type: 'string' },
                  },
                },
              },
              temperature: { type: 'number' },
              max_tokens: { type: 'integer' },
              top_p: { type: 'number' },
              stream: { type: 'boolean' },
            },
            additionalProperties: true,
          },
          PredictionResponse: {
            type: 'object',
            additionalProperties: true,
            description:
              'Model response. Exact fields depend on the uploaded model and optional post-processing script.',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    };
  }

  private ensureOpenApiRequestExample(
    parsed: JsonValue,
    raw: string | null,
    apiStyle: ModelIntegrationSpec['endpoint']['apiStyle'],
  ): JsonValue {
    if (parsed !== null) {
      return parsed;
    }
    if (raw) {
      return { raw };
    }
    if (apiStyle === 'openai-chat') {
      return {
        messages: [{ role: 'user', content: 'Explain what this model does.' }],
        temperature: 0.7,
        stream: false,
      };
    }
    return { features: [1.2, 3.4, 5.6] };
  }

  private ensureOpenApiResponseExample(
    parsed: JsonValue,
    raw: string | null,
  ): JsonValue {
    if (parsed !== null) {
      return parsed;
    }
    if (raw) {
      return { raw };
    }
    return { prediction: 'model_output' };
  }

  /**
   * Returns deterministic, model-style-specific integration guidance notes.
   */
  private buildNotes(isLlm: boolean): string[] {
    const notes = [
      'Send requests with header "Content-Type: application/json".',
      'The model auto-deploys on first call; the initial request may take longer while the container starts.',
      isLlm
        ? 'Each successful prediction debits credits based on token usage (input and output tokens are billed at separate rates per 1M tokens).'
        : 'Each successful prediction debits the configured credits from the caller wallet.',
    ];
    if (isLlm) {
      notes.push(
        'This is an OpenAI-compatible chat model: POST an OpenAI chat-completions style body to the predict URL.',
      );
    }
    return notes;
  }

  /**
   * Builds the pricing descriptor for the integration spec. LLM_GGUF models use
   * token-based pricing (separate input/output rates); all other types use a flat
   * per-request or per-prediction rate.
   */
  private async buildPricingSpec(model: {
    type: ModelType;
    costPerRequest: number;
    hasCustomPricing: boolean;
  }): Promise<ModelIntegrationSpec['pricing']> {
    const isLlm = model.type === ModelType.LLM_GGUF;
    const billingUnit = getBillingUnit(model.type);

    if (isLlm) {
      const [inputConfig, outputConfig] = await Promise.all([
        this.systemConfigRepository.findOne({
          where: { key: 'price_llm_gguf_input' },
        }),
        this.systemConfigRepository.findOne({
          where: { key: 'price_llm_gguf_output' },
        }),
      ]);
      return {
        billingUnit,
        inputCreditsPerMToken: inputConfig
          ? parseFloat(inputConfig.value)
          : 2.0,
        outputCreditsPerMToken: outputConfig
          ? parseFloat(outputConfig.value)
          : 8.0,
        currency: 'CREDITS',
        note: 'Input and output tokens billed at separate rates per 1M tokens processed.',
      };
    }

    const creditsPerRequest = model.hasCustomPricing
      ? Number(model.costPerRequest) || 0
      : await this.getDefaultPrice(model.type);

    return {
      billingUnit,
      creditsPerRequest,
      currency: 'CREDITS',
      note: `Billed per ${billingUnit === BillingUnit.PER_IMAGE ? 'image' : 'prediction'}.`,
    };
  }

  /**
   * Retrieves the system-default price for a given model type from system_configs.
   */
  private async getDefaultPrice(modelType: string): Promise<number> {
    const key = 'price_' + modelType.toLowerCase();
    const config = await this.systemConfigRepository.findOne({
      where: { key },
    });
    return config ? parseFloat(config.value) : 0.1;
  }
}
