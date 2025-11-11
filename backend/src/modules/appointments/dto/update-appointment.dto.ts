import { IsDateString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

/**
 * DTO for updating an appointment (T073)
 * Includes version for optimistic locking
 */
export class UpdateAppointmentDto {
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsNumber()
  currentVersion: number; // For optimistic locking
}
