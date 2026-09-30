const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  { ignores: ['dist/*', 'web-build/*', '.expo/*'] },
  { files: ['__tests__/**/*.js'], languageOptions: { globals: { jest: 'readonly', test: 'readonly', expect: 'readonly', describe: 'readonly', beforeEach: 'readonly' } } },
  {
    files: ['app/**/*.js', 'src/components/**/*.js', 'src/ui/**/*.js'],
    rules: {
      // Colours come from src/theme/tokens.js only (docs/design.md).
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]', message: 'Use a colour from the theme (useTheme().c) instead of a hex value.' },
      ],
    },
  },
];
