import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * SOAP section types
 */
export enum SoapSection {
  SUBJECTIVE = 'subjective',
  OBJECTIVE = 'objective',
  ASSESSMENT = 'assessment',
  PLAN = 'plan',
}

/**
 * Partial note context for AI completion
 */
export class PartialNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  subjective?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  objective?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  assessment?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  plan?: string;

  @IsEnum(SoapSection, { message: 'soapSection must be one of: subjective, objective, assessment, plan' })
  @IsNotEmpty()
  soapSection: SoapSection;
}

/**
 * Context for AI completion
 */
export class ContextDto {
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsString()
  @IsNotEmpty()
  appointmentDate: string;
}

/**
 * DTO for AI autocompletion request
 * Per FR-044: AI-powered SOAP note completion
 */
export class AICompleteDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PartialNoteDto)
  partialNote: PartialNoteDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ContextDto)
  context: ContextDto;
}
