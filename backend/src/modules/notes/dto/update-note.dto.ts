import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

/**
 * DTO for updating a clinical note
 * Per FR-049: All fields optional for partial updates with version control
 */
export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Subjective section cannot exceed 10,000 characters' })
  subjective?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Objective section cannot exceed 10,000 characters' })
  objective?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Assessment section cannot exceed 10,000 characters' })
  assessment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000, { message: 'Plan section cannot exceed 10,000 characters' })
  plan?: string;

  @IsBoolean()
  @IsOptional()
  sharedWithPatient?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Version must be at least 1' })
  currentVersion?: number; // For optimistic locking
}
