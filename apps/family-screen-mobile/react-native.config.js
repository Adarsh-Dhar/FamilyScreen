const path = require('path');

module.exports = {
  project: {
    ios: {},
    android: {
      sourceDir: path.join(__dirname, 'android'),
      packageName: 'com.familyscreen.mobile',
    },
  },
  dependencies: {},
};