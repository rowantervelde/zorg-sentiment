import nuxt from '@nuxtjs/eslint-config-typescript'

export default [
  nuxt,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
]
