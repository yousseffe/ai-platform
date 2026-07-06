import { IsString, IsOptional } from 'class-validator';

export class ConfirmSchemaDto {
  @IsString()
  @IsOptional()
  examplePayload?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;
}
