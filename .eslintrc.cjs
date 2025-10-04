module.exports = {
  root: true,
  extends: ['@nuxtjs/eslint-config-typescript'],
  ignorePatterns: ['.nuxt/**', 'dist/**'],
  overrides: [
    {
      files: ['**/*.mjs', '**/*.cjs'],
      env: {
        node: true
      }
    },
    {
      files: ['tests/**/*.ts'],
      env: {
        node: true
      }
    }
  ],
  rules: {
    'vue/multi-word-component-names': 'off'
  }
}
