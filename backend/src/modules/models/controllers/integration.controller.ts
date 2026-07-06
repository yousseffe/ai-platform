import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiIdentityService } from '../../auth';
import { Request } from 'express';
import {
  ModelIntegrationService,
  ModelIntegrationSpec,
  OpenApiDocument,
} from '../services/model-integration.service';

@Controller('models')
export class IntegrationController {
  constructor(
    private readonly modelIntegrationService: ModelIntegrationService,
    private readonly apiIdentityService: ApiIdentityService,
  ) {}

  @Get(':id/integration-spec')
  async getIntegrationSpec(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ModelIntegrationSpec> {
    const actorId = await this.resolveActorId(req);

    return this.modelIntegrationService.getIntegrationSpec(id, actorId);
  }

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

        if (identity.keyType === 'mcp') {
          if (!identity.mcpScopes?.includes('models:read')) {
            throw new UnauthorizedException(
              'MCP Access Token lacks models:read scope',
            );
          }
        }

        actorId = identity.userId || identity.orgId || undefined;
      } catch (err: unknown) {
        if (
          err instanceof UnauthorizedException &&
          (err as Error).message.includes('scope')
        ) {
          throw err;
        }
      }
    }

    return actorId;
  }
}
