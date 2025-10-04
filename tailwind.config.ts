import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './src/components/**/*.{vue,js,ts}',
    './src/pages/**/*.{vue,js,ts}',
    './src/composables/**/*.{js,ts}',
    './src/utils/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        positive: '#0ea5e9',
        neutral: '#a0aec0',
        negative: '#ef4444',
        accent: '#facc15'
      }
    }
  },
  plugins: []
}
