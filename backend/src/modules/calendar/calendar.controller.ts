import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { CalendarService } from './calendar.service';

/**
 * Calendar Controller (T099)
 * Per FR-023: iCal feed export endpoints
 */
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * GET /calendar/export/:token (T099)
   * Export practitioner calendar as iCal feed
   * Per FR-023: Secure iCal feed generation with calendar token
   *
   * This endpoint is PUBLIC (no authentication) but requires valid calendar token
   */
  @Get('export/:token')
  @HttpCode(HttpStatus.OK)
  async exportCalendar(@Param('token') token: string, @Res() res: Response) {
    try {
      // Generate iCal feed
      const icalFeed = await this.calendarService.generateICalFeed(token);

      // Set proper headers for iCal response
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="calendar.ics"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send iCal content
      return res.send(icalFeed);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        res.status(HttpStatus.UNAUTHORIZED).send('Invalid calendar token');
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to generate calendar');
      }
    }
  }
}
