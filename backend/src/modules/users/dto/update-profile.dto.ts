import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  full_name?: string;
}
