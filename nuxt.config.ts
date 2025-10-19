import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  srcDir: 'src/',
  pages: false,
  ssr: true,
  nitro: {
    preset: process.env.NUXT_PRESET || 'netlify'
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],
  css: ['~/assets/styles/main.css'],
  
  // Runtime configuration for sentiment service (T005)
  runtimeConfig: {
    // Private keys (server-side only) - accessed via useRuntimeConfig()
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    redditClientId: process.env.REDDIT_CLIENT_ID || '',
    redditClientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    redditUserAgent: process.env.REDDIT_USER_AGENT || 'ZorgSentiment/1.0',
    mastodonInstanceUrl: process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social',
    mastodonAccessToken: process.env.MASTODON_ACCESS_TOKEN || '',
    rssNumlUrl: process.env.RSS_NUML_URL || 'https://www.nu.nl/rss/Gezondheid',
    tweakersForumUrl: process.env.TWEAKERS_FORUM_URL || 'https://tweakers.net/nieuws/zoeken/?keyword=zorg',
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    
    // Service configuration
    sentimentCacheTtlMinutes: process.env.SENTIMENT_CACHE_TTL_MINUTES || '15',
    sentimentRetentionHours: process.env.SENTIMENT_RETENTION_HOURS || '24',
    sentimentMinSampleSize: process.env.SENTIMENT_MIN_SAMPLE_SIZE || '50',
    
    // Rate limiting configuration
    rateLimitTwitter: process.env.RATE_LIMIT_TWITTER || '100',
    rateLimitReddit: process.env.RATE_LIMIT_REDDIT || '60',
    rateLimitMastodon: process.env.RATE_LIMIT_MASTODON || '300',
    rateLimitRss: process.env.RATE_LIMIT_RSS || '60',
    rateLimitTweakers: process.env.RATE_LIMIT_TWEAKERS || '60',
    
    // Spike detection configuration
    spikeLookbackHours: process.env.SPIKE_LOOKBACK_HOURS || '24',
    spikeStdDevThreshold: process.env.SPIKE_STD_DEV_THRESHOLD || '2.0',
    
    // Language detection configuration
    languageDetectionThreshold: process.env.LANGUAGE_DETECTION_THRESHOLD || '0.7',
    minDutchConfidence: process.env.MIN_DUTCH_CONFIDENCE || '0.6',
    
    public: {
      // Public config (client-side accessible)
      // Add any public configuration here if needed
    }
  },
  
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