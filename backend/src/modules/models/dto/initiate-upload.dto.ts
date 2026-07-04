import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';

/**
 * Data Transfer Object for initiating a chunked multipart upload session for a
 * new model version. Carries the source filenames and the total model file size
 * used to compute presigned part URLs.
 */
export class InitiateUploadDto {
  /**
   * Original filename of the model weights artifact being uploaded.
   */
  @IsString()
  @IsNotEmpty()
  modelFilename: string;

  /**
   * Total size in bytes of the model weights artifact. Used to compute the
   * number of multipart chunks required.
   */
  @IsNumber()
  @Min(1)
  modelSize: number;

  /**
   * Original filename of the optional scaler artifact.
   */
  @IsString()
  @IsOptional()
  scalerFilename?: string;

  /**
   * Original filename of the optional preprocessing script.
   */
  @IsString()
  @IsOptional()
  preprocessFilename?: string;

  /**
   * Original filename of the optional postprocessing script.
   */
  @IsString()
  @IsOptional()
  postprocessFilename?: string;
}
