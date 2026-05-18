import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  taskType?: string;

  @IsString()
  @IsOptional()
  framework?: string;
}
