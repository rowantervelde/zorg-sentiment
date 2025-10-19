# Netlify Functions Migration

**Date**: October 19, 2025  
**Status**: ✅ Completed

## Overview

Migrated from static site generation to Netlify Functions deployment to enable server-side API routes for live sentiment analysis.

## Changes Made

### 1. Nuxt Configuration (`nuxt.config.ts`)

- Changed Nitro preset from `static` to `netlify`
- This enables serverless function deployment for all `/server/api/*` routes

**Before:**

```typescript
nitro: {
  preset: 'static'
}
```

**After:**

```typescript
nitro: {
  preset: 'netlify'
}
```

### 2. Netlify Configuration (`netlify.toml`)

- Changed build command from `npm run generate` to `npm run build`
- Updated redirect to point to Netlify Functions server

**Before:**

```toml
[build]
  command = "npm run generate"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**After:**

```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
```

### 3. Package Scripts (`package.json`)

- Added `build` script: `"build": "nuxt build"`

## What This Enables

✅ **Server-side API Routes**: All routes in `/src/server/api/` now run as Netlify Functions  
✅ **Secure API Keys**: Runtime config secrets stay server-side only  
✅ **Live Data Fetching**: Can fetch from Twitter, Reddit, Mastodon, RSS feeds  
✅ **Real-time Sentiment Analysis**: Process and analyze data on-demand  
✅ **Dynamic Responses**: API responses generated per-request, not pre-rendered

## API Routes Now Available

- `/api/sentiment/snapshot` - Get current sentiment snapshot
- `/api/sentiment/index` - Get sentiment index
- `/api/topics/trending` - Get trending topics
- `/api/commentary/current` - Get current commentary

## Build Output

When deployed to Netlify, you should now see:

- Client-side assets in `.output/public/`
- Server-side function in `.netlify/functions/server/`

## Local Development

No changes needed for local development:

```bash
npm run dev
```

## Deployment

The next Netlify deployment will:

1. Build the Nuxt app with `npm run build`
2. Deploy static assets to CDN
3. Deploy API routes as serverless functions
4. Route all requests through the function server

## Environment Variables

Make sure to configure these in Netlify dashboard under **Site settings > Environment variables**:

### Required for Production (when implementing real sources)

- `TWITTER_BEARER_TOKEN`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `MASTODON_ACCESS_TOKEN`
- `RSS_NUML_URL`
- `TWEAKERS_FORUM_URL`

### Optional Configuration

- `SENTIMENT_CACHE_TTL_MINUTES` (default: 15)
- `SENTIMENT_RETENTION_HOURS` (default: 24)
- `ALERT_WEBHOOK_URL`

## Testing

After deployment, verify functions are working:

```bash
curl https://your-site.netlify.app/api/sentiment/snapshot
```

## Rollback

To rollback to static mode:

1. Change `nuxt.config.ts` preset back to `'static'`
2. Change `netlify.toml` command to `npm run generate`
3. Revert redirect in `netlify.toml` to `/index.html`

## Related Specs

- `specs/002-sentiment-snapshot-service/` - Main spec for sentiment service
- `.github/copilot-instructions.md` - Updated with deployment approach
