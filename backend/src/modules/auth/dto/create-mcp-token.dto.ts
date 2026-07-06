import {
  IsString,
  IsNotEmpty,
  Length,
  IsArray,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { McpScope } from '../enums/mcp-scope.enum';

export class CreateMcpTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Token name is required' })
  @Length(1, 80, { message: 'Token name must be between 1 and 80 characters' })
  name: string;

  @IsArray()
  @IsNotEmpty({ message: 'At least one scope is required' })
  @IsEnum(McpScope, { each: true, message: 'Invalid scope specified' })
  scopes: McpScope[];

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Expiration days must be at least 1' })
  @Max(365, { message: 'Expiration days cannot exceed 365' })
  expiresInDays?: number | null;
}
