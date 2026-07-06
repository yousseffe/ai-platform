import { IsString, IsNotEmpty } from 'class-validator';

export class AbortUploadDto {
  @IsString()
  @IsNotEmpty()
  objectKey: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;
}
