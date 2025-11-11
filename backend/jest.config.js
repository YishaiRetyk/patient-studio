module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  // Separate configuration for integration tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
    },
    {
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.spec.ts'],
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-contract.ts'],
    },
  ],
};
