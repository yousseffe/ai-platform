import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import {
  ModelIntegrationService,
  ModelIntegrationSpec,
} from '../services/model-integration.service';

interface ActorRequest {
  user: { id: string };
}

/**
 * Exposes a consumer-facing integration spec for a model: how to call its
 * prediction API (endpoint, auth header format, request/response samples,
 * pricing). Consumed by the MCP server's `integration_get_model_spec` tool.
 */
@Controller('models')
export class IntegrationController {
  constructor(
    private readonly modelIntegrationService: ModelIntegrationService,
  ) {}

  /**
   * Returns the {@link ModelIntegrationSpec} for a model the caller may access.
   *
   * @param id - Model UUID.
   * @param req - Authenticated request (API key or JWT).
   * @returns The integration spec.
   */
  @Get(':id/integration-spec')
  @UseGuards(ApiKeyOrJwtGuard)
  async getIntegrationSpec(
    @Param('id') id: string,
    @Req() req: ActorRequest,
  ): Promise<ModelIntegrationSpec> {
    return this.modelIntegrationService.getIntegrationSpec(id, req.user.id);
  }
}
