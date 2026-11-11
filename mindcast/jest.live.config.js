/** Live API checks (opt-in). Plain Node environment so the real fetch is used, not Expo's native stub.
 *  Run: npm run test:live  (in a proxied container, prefix NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<bundle>) */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/live/**/*.test.ts"],
  transform: { "^.+\\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }] },
  transformIgnorePatterns: ["node_modules/(?!(expo|expo-modules-core)/)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-location$": "<rootDir>/src/__tests__/mocks/location.js",
    "^@react-native-async-storage/async-storage$": "<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js",
  },
};
