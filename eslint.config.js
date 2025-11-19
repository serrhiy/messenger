'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  {
    files: ['./'],
    rules: init,
  },
  {
    files: ['src/static'],
    rules: {
      ...init,
      sourceType: 'module',
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      strict: 'off',
      camelcase: 'off',
    },
    languageOptions: {
      globals: {
        application: true,
        lib: true,
      },
    },
  },
];
