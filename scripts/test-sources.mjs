/**
 * Test script to verify source fetching works locally
 * Bypasses the API endpoint and calls the aggregator directly
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: join(__dirname, '..', '.env') });

console.log('🔧 Environment check:');
console.log('   Twitter:', process.env.TWITTER_BEARER_TOKEN ? '✓' : '✗');
console.log('   Reddit:', process.env.REDDIT_CLIENT_ID ? '✓' : '✗');
console.log('   Mastodon:', process.env.MASTODON_ACCESS_TOKEN ? '✓' : '✗');
console.log('   RSS URL:', process.env.RSS_NUML_URL || 'default');
console.log('   Tweakers URL:', process.env.TWEAKERS_FORUM_URL || 'default');
console.log('   Lookback hours:', process.env.SENTIMENT_LOOKBACK_HOURS || '1');
console.log('');

// Dynamically import the aggregator
console.log('📦 Loading aggregator...');

try {
  const { SentimentAggregator } = await import('../src/server/api/sentiment/_lib/aggregator.ts');
  
  console.log('✅ Aggregator loaded\n');
  console.log('🔍 Fetching from all sources...\n');
  
  const aggregator = new SentimentAggregator({
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
    redditClientId: process.env.REDDIT_CLIENT_ID,
    redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
    redditUserAgent: process.env.REDDIT_USER_AGENT,
    mastodonInstanceUrl: process.env.MASTODON_INSTANCE_URL,
    mastodonAccessToken: process.env.MASTODON_ACCESS_TOKEN,
    rssNumlUrl: process.env.RSS_NUML_URL,
    tweakersForumUrl: process.env.TWEAKERS_FORUM_URL,
  });

  const result = await aggregator.aggregate();
  
  console.log('\n📊 Results:');
  console.log('   Total posts:', result.posts.length);
  console.log('   Backfilled:', result.backfilled);
  console.log('\n📡 Source Status:');
  
  for (const source of result.sources) {
    const icon = source.status === 'available' ? '✅' : '❌';
    const posts = result.posts.filter(p => p.source === source.source_id).length;
    console.log(`   ${icon} ${source.source_id.padEnd(15)} - ${posts} posts - ${source.status}`);
    if (source.error_message) {
      console.log(`      Error: ${source.error_message}`);
    }
  }
  
  if (result.posts.length > 0) {
    console.log('\n📝 Sample posts (first 3):');
    result.posts.slice(0, 3).forEach((post, i) => {
      console.log(`\n   ${i + 1}. [${post.source}] ${post.sentiment_label} (${post.sentiment_score.toFixed(2)})`);
      console.log(`      ${post.text.slice(0, 100)}...`);
      console.log(`      Topics: ${post.topics.join(', ') || 'none'}`);
    });
  }
  
  console.log('\n✅ Test complete!');
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
