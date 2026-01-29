export default {
  projects: [
    {
      displayName: 'node',
      testMatch: ['<rootDir>/lib/__tests__/**/*.test.js', '<rootDir>/api/ali/super-admin/__tests__/**/*.test.js'],
      testEnvironment: 'node',
      transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
    },
    {
      displayName: 'dom',
      testMatch: ['**/__tests__/**/*.(js|jsx)', '**/*.(test|spec).(js|jsx)'],
      testPathIgnorePatterns: ['/lib/__tests__/', '/api/ali/super-admin/__tests__/'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
      collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/**/*.stories.{js,jsx}',
        '!src/main.jsx',
      ],
      coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
    },
  ],
};
