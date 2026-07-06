import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ModelType } from '../enums/model-type.enum';
import { Framework } from '../enums/framework.enum';
import { TaskType } from '../enums/task-type.enum';

export class SearchModelsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @IsOptional()
  @IsEnum(ModelType)
  type?: ModelType;

  @IsOptional()
  @IsEnum(Framework)
  framework?: Framework;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
