import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { ClinicalNotesController } from './notes.controller';
import { ClinicalNotesService } from './notes.service';
import { AIService } from './ai.service';
import { EncryptionService } from './encryption.service';
import { PDFService } from './pdf.service';

/**
 * Clinical Notes Module
 * Task ID: T124
 * Per FR-043 to FR-053: SOAP notes with AI, encryption, and PDF export
 */
@Module({
  imports: [ConfigModule],
  controllers: [ClinicalNotesController],
  providers: [
    ClinicalNotesService,
    AIService,
    EncryptionService,
    PDFService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [ClinicalNotesService, AIService, EncryptionService, PDFService],
})
export class ClinicalNotesModule {}
