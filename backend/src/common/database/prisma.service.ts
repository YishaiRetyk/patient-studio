import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service (T054)
 * Per plan.md: Prisma 5.x ORM with PostgreSQL 16
 * Manages database connection lifecycle and provides Prisma client
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // Log Prisma queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // Log errors in all environments
    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`);
    });

    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Set tenant context for Row-Level Security
   * Per 02-tenant-isolation.sql: app.current_tenant_id
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
  }

  /**
   * Clear tenant context
   */
  async clearTenantContext(): Promise<void> {
    await this.$executeRawUnsafe(`RESET app.current_tenant_id`);
  }
}
