import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for creating or updating a model comment/rating.
 */
export class CreateReviewDto {
  /**
   * Star rating between 1 (poor) and 5 (excellent).
   */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /**
   * Optional text comment or explanation.
   */
  @IsString()
  @IsOptional()
  comment?: string;
}
