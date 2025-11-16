import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO for querying appointment availability (T070)
 * Per FR-012: Real-time availability display
 */
export class GetAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  practitionerId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
