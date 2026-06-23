import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';

/**
 * Data Transfer Object for creating a new model catalog registry.
 */
export class CreateModelDto {
  /**
   * Human-readable label identifying the ML model.
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Description describing the model's domain and usage.
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Primary category classification of the model.
   */
  @IsEnum(ModelType)
  @IsOptional()
  type?: ModelType;

  /**
   * The specific ML task execution domain of the model.
   */
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  /**
   * The developer framework/engine of the model artifact.
   */
  @IsEnum(Framework)
  @IsOptional()
  framework?: Framework;

  /**
   * Visibility flag indicating whether the model is public in the marketplace.
   */
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
