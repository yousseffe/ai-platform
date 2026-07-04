import { IsBoolean } from 'class-validator';

/**
 * Data Transfer Object for updating a model's container network policy.
 */
export class UpdateNetworkSettingsDto {
  /**
   * Whether the model's deployed containers may reach the internet.
   * False (the default) places the container on an isolated, internal-only
   * Docker network with no outbound route.
   */
  @IsBoolean()
  allowEgress: boolean;
}
