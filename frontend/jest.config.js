const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/tests/e2e/',
        '<rootDir>/tests/visual/'
    ],
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{js,jsx,ts,tsx}',
        '!src/**/index.{js,jsx,ts,tsx}',
        '!src/app/**', // Exclude Next.js app directory
        '!src/lib/monitoring.ts', // Exclude monitoring setup
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        // Specific thresholds for critical components
        'src/components/ui/**/*.{js,jsx,ts,tsx}': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
        'src/stores/**/*.{js,jsx,ts,tsx}': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
        'src/lib/**/*.{js,jsx,ts,tsx}': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/tests/accessibility/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/tests/performance/**/*.{js,jsx,ts,tsx}',
    ],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },
    transformIgnorePatterns: [
        '/node_modules/',
        '^.+\\.module\\.(css|sass|scss)$',
    ],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    },
    setupFiles: ['<rootDir>/jest.polyfills.js'],
    testEnvironmentOptions: {
        customExportConditions: [''],
    },
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'test-results',
            outputName: 'junit.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true,
        }],
        ['jest-html-reporters', {
            publicPath: 'test-results',
            filename: 'report.html',
            expand: true,
        }],
    ],
    maxWorkers: '50%',
    testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)