import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for aborting an in-progress multipart upload session,
 * releasing the orphaned storage-side upload state so it does not leak.
 */
export class AbortUploadDto {
  /**
   * Storage key identifying the object whose multipart upload should be aborted.
   */
  @IsString()
  @IsNotEmpty()
  objectKey: string;

  /**
   * The multipart upload session identifier issued during initiation.
   */
  @IsString()
  @IsNotEmpty()
  uploadId: string;
}
