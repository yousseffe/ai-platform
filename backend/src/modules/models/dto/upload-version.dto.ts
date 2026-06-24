import { IsString, IsOptional } from 'class-validator';

export class UploadVersionDto {
  @IsString()
  @IsOptional()
  examplePayload?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;

  @IsString()
  @IsOptional()
  triggerBuild?: string;
}

