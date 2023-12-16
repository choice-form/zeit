/**
 * @type {import('prettier').Options}
 */
module.exports = {
  $schema: 'https://json.schemastore.org/prettierrc',
  plugins: ['prettier-plugin-packagejson'],
  overrides: [
    { files: '*.{cjs,js,jsx,mjs,ts,tsx}', options: { singleQuote: true } },
  ],
  printWidth: 80,
  semi: false,
  singleQuote: false,
}
