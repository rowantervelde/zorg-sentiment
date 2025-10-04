import nuxt from '@nuxtjs/eslint-config-typescript'
import globals from 'globals'

export default [
  {
    ignores: ['.nuxt/**', '**/.nuxt/**', 'dist/**']
  },
  nuxt,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
]
