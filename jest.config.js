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
      // Anchored to <rootDir>. These exist to hand the root-level lib/ and the
      // super-admin API tests to the "node" project above. Unanchored, the
      // '/lib/__tests__/' pattern also matched src/lib/__tests__/, which the
      // node project does not pick up either — so any test placed there ran in
      // neither project and passed silently by never executing.
      testPathIgnorePatterns: [
        '<rootDir>/lib/__tests__/',
        '<rootDir>/api/ali/super-admin/__tests__/',
      ],
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
