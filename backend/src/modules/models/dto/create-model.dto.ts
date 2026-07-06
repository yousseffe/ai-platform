import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ModelType)
  @IsOptional()
  type?: ModelType;

  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @IsEnum(Framework)
  @IsOptional()
  framework?: Framework;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
