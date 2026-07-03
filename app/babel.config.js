module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // v5 stack: reanimated 4 delegates worklet transforms to react-native-worklets;
  // its own docs require this plugin to be LAST in the plugins array.
  // (react-native-reanimated/plugin is kept only as a thin re-export of this one,
  // so we depend on the worklets package directly — see task-7-report.md.)
  plugins: ['react-native-worklets/plugin'],
};
