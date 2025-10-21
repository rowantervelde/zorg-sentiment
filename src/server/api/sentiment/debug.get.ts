/**
 * Debug endpoint to check source configuration and status
 * GET /api/sentiment/debug
 */

import { defineEventHandler } from 'h3';

export default defineEventHandler(async () => {
  return {
    env_check: {
      twitter: !!process.env.TWITTER_BEARER_TOKEN,
      reddit_id: !!process.env.REDDIT_CLIENT_ID,
      reddit_secret: !!process.env.REDDIT_CLIENT_SECRET,
      mastodon_token: !!process.env.MASTODON_ACCESS_TOKEN,
      mastodon_url: process.env.MASTODON_INSTANCE_URL,
      rss_url: process.env.RSS_NUML_URL,
      tweakers_url: process.env.TWEAKERS_FORUM_URL,
    },
    timestamp: new Date().toISOString(),
  };
});
