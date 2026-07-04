import { IsString, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for confirming (and optionally correcting) a model
 * version's auto-detected or pending example payload/expected result.
 */
export class ConfirmSchemaDto {
  /**
   * Optional replacement sample request payload, as a JSON string.
   */
  @IsString()
  @IsOptional()
  examplePayload?: string;

  /**
   * Optional replacement sample response result, as a JSON string.
   */
  @IsString()
  @IsOptional()
  expectedResult?: string;
}
