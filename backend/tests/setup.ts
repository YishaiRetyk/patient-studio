/**
 * Jest Setup for Unit Tests
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/patient_studio_test?schema=public';
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';

// Mock AWS SDK clients for unit tests
jest.mock('@aws-sdk/client-kms');
jest.mock('@aws-sdk/client-s3');

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

// Global test timeout
jest.setTimeout(30000);
