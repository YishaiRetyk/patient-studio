import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Database Module
 * Provides global access to PrismaService
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
