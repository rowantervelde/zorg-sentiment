/**
 * Fetch sentiment data from configured sources
 * Calls the /api/sentiment endpoint to trigger aggregation
 * Run via GitHub Actions every 15 minutes
 */

async function fetchSentiment() {
  // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
  const siteUrl = process.env.SITE_URL || 'https://zorg-sentiment.netlify.app';
  const url = siteUrl.replace('localhost', '127.0.0.1');
  
  console.log(`Fetching sentiment from ${url}/api/sentiment...`);
  
  try {
    const response = await fetch(`${url}/api/sentiment`, {
      headers: {
        'User-Agent': 'zorg-sentiment-fetcher/1.0',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Sentiment data fetched successfully');
    console.log(`   Sources available: ${data.sources?.filter(s => s.status === 'available').length || 0}`);
    console.log(`   Total posts: ${data.data_quality?.sample_size || 0}`);
    console.log(`   Overall score: ${data.overall_score?.toFixed(2) || 'N/A'}`);
    console.log(`   Timestamp: ${data.generated_at}`);

    return data;
  } catch (error) {
    console.error('❌ Failed to fetch sentiment:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

fetchSentiment();
