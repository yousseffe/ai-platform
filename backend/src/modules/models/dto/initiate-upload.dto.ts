import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class InitiateUploadDto {
  @IsString()
  @IsNotEmpty()
  modelFilename: string;

  @IsNumber()
  @Min(1)
  modelSize: number;

  @IsString()
  @IsOptional()
  scalerFilename?: string;

  @IsString()
  @IsOptional()
  preprocessFilename?: string;

  @IsString()
  @IsOptional()
  postprocessFilename?: string;
}
