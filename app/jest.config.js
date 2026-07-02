module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|mp3|wav|m4a)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
