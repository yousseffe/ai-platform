import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiIdentityService } from '../../auth/services/api-identity.service';
import { Request } from 'express';
import {
  ModelIntegrationService,
  ModelIntegrationSpec,
  OpenApiDocument,
} from '../services/model-integration.service';

/**
 * Exposes a consumer-facing integration spec for a model: how to call its
 * prediction API (endpoint, auth header format, request/response samples,
 * pricing). Consumed by the MCP server's `integration_get_model_spec` tool.
 */
@Controller('models')
export class IntegrationController {
  constructor(
    private readonly modelIntegrationService: ModelIntegrationService,
    private readonly apiIdentityService: ApiIdentityService,
  ) {}

  /**
   * Returns the {@link ModelIntegrationSpec} for a model the caller may access.
   *
   * @param id - Model UUID.
   * @param req - Request containing the Authorization header.
   * @returns The integration spec.
   */
  @Get(':id/integration-spec')
  async getIntegrationSpec(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ModelIntegrationSpec> {
    const actorId = await this.resolveActorId(req);

    return this.modelIntegrationService.getIntegrationSpec(id, actorId);
  }

  /**
   * Returns a standards-compliant OpenAPI document for this model's predict API.
   */
  @Get(':id/openapi.json')
  async getOpenApiDocument(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<OpenApiDocument> {
    const actorId = await this.resolveActorId(req);

    return this.modelIntegrationService.getOpenApiDocument(id, actorId);
  }

  private async resolveActorId(req: Request): Promise<string | undefined> {
    let actorId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const identity = await this.apiIdentityService.resolve(authHeader);

        // If it's an MCP token, verify it carries the 'models:read' scope
        if (identity.keyType === 'mcp') {
          if (!identity.mcpScopes?.includes('models:read')) {
            throw new UnauthorizedException(
              'MCP Access Token lacks models:read scope',
            );
          }
        }

        actorId = identity.userId || identity.orgId || undefined;
      } catch (err) {
        // If credentials are invalid, we let it fall back to unauthenticated (actorId = undefined)
        // unless it's a scope error which we want to surface.
        if (
          err instanceof UnauthorizedException &&
          err.message.includes('scope')
        ) {
          throw err;
        }
      }
    }

    return actorId;
  }
}
