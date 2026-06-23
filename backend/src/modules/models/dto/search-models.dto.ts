import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ModelType } from '../enums/model-type.enum';
import { Framework } from '../enums/framework.enum';
import { TaskType } from '../enums/task-type.enum';

/**
 * Validated query parameters for the public model search endpoint.
 * All fields are optional — omitting a field means no restriction on that axis.
 */
export class SearchModelsDto {
  /**
   * Free-text search query applied with fuzzy matching across name,
   * description, framework, type, and taskType fields.
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  /**
   * Filter results to a specific model type classification.
   */
  @IsOptional()
  @IsEnum(ModelType)
  type?: ModelType;

  /**
   * Filter results to a specific ML framework.
   */
  @IsOptional()
  @IsEnum(Framework)
  framework?: Framework;

  /**
   * Filter results to a specific task category.
   */
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  /**
   * Requested page number (1-indexed). Defaults to 1.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of results per page. Defaults to 20, maximum 100.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
