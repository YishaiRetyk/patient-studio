import { Module } from '@nestjs/common';
import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';
import { DatabaseModule } from '../../common/database/database.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Practitioners Module (T101)
 * Per FR-021 to FR-023: Practitioner calendar management
 */
@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PractitionersController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule {}
