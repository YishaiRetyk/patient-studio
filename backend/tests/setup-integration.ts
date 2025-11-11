/**
 * Jest Setup for Integration Tests
 * Runs before integration test suite
 * Per Constitution Principle IV: Test-First for Healthcare PHI handling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Ensure test database is clean
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');

  // Run migrations
  // Note: In real implementation, use `prisma migrate deploy` via CLI
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/patient_studio_test?schema=public';
