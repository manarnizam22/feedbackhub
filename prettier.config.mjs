/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  printWidth: 100,
  overrides: [
    {
      files: '*.html',
      options: { parser: 'angular' },
    },
  ],
};
