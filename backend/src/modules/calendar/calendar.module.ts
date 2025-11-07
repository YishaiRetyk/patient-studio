import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { DatabaseModule } from '../../common/database/database.module';

/**
 * Calendar Module (T101)
 * Per FR-023: iCal feed generation
 */
@Module({
  imports: [DatabaseModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
