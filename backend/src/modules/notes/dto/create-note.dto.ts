import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a clinical note
 * Per FR-043: All SOAP sections are required
 */
export class CreateNoteDto {
  @IsUUID()
  @IsNotEmpty()
  appointmentId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Subjective section cannot be empty' })
  @MaxLength(10000, { message: 'Subjective section cannot exceed 10,000 characters' })
  subjective: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Objective section cannot be empty' })
  @MaxLength(10000, { message: 'Objective section cannot exceed 10,000 characters' })
  objective: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Assessment section cannot be empty' })
  @MaxLength(10000, { message: 'Assessment section cannot exceed 10,000 characters' })
  assessment: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Plan section cannot be empty' })
  @MaxLength(10000, { message: 'Plan section cannot exceed 10,000 characters' })
  plan: string;

  @IsBoolean()
  @IsOptional()
  sharedWithPatient?: boolean;
}
