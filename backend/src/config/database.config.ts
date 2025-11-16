import { registerAs } from '@nestjs/config';

/**
 * Database Configuration
 * Per plan.md: PostgreSQL 16 with Prisma 5.x ORM
 */
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // RLS tenant context management
  rls: {
    enabled: true,
    sessionVariable: 'app.current_tenant_id',
  },
}));
