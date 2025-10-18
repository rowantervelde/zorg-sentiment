import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  srcDir: 'src/',
  pages: false,
  ssr: true,
  nitro: {
    preset: 'static'
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],
  css: ['~/assets/styles/main.css'],
  app: {
    head: {
      title: 'Zorg Sentiment Dashboard',
      meta: [
        { name: 'description', content: 'Playful national mood dashboard for Dutch healthcare sentiment.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }
      ]
    }
  },
  experimental: {
    payloadExtraction: false
  }
})