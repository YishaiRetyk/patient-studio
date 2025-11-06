import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating an appointment (T070)
 * Per FR-011 to FR-014: Appointment booking with validation
 */
export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @IsUUID()
  @IsNotEmpty()
  practitionerId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
