# Netlify Deployment Guide

**Feature**: Sentiment Snapshot Service  
**Target Platform**: Netlify  
**Deployment Mode**: Static Site + Serverless Functions  
**Last Updated**: 2025-10-17

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
✅ GitHub repository ready  
✅ Netlify account created (free tier works)  
✅ All 56 tasks complete (100%)  
✅ Tests passing (146 tests)

### Deployment Steps

1. **Connect Repository to Netlify**
2. **Configure Build Settings**
3. **Set Environment Variables** (optional but recommended)
4. **Deploy!**

---

## Step 1: Connect Repository to Netlify

### Option A: Netlify Dashboard (Recommended)

1. **Log in to Netlify**: https://app.netlify.com/

2. **Click "Add new site"** → "Import an existing project"

3. **Connect to Git Provider**:
   - Select "GitHub"
   - Authorize Netlify to access your repositories
   - Select repository: `rowantervelde/zorg-sentiment`
   - Select branch: `002-sentiment-snapshot-service` (or `main` if merged)

4. **Configure Site Settings**:
   - Site name: `zorg-sentiment` (or custom name)
   - Branch to deploy: `002-sentiment-snapshot-service`
   - Build settings are auto-detected from `netlify.toml` ✅

5. **Click "Deploy site"**

### Option B: Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (from project root)
cd c:\git\github\zorg-sentiment
netlify init

# Follow prompts:
# - Create & configure a new site
# - Team: Select your team
# - Site name: zorg-sentiment (or custom)
# - Build command: npm run generate (auto-detected)
# - Publish directory: dist (auto-detected)
```

---

## Step 2: Verify Build Configuration

Netlify will read from `netlify.toml` (already configured):

```toml
[build]
  command = "npm run generate"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### ⚠️ Important: Update Publish Directory

Your current `netlify.toml` has `publish = "dist"`, but Nuxt 3 generates to `.output/public`. Let's fix this:

**Action Required**: Update `netlify.toml`:

```toml
[build]
  command = "npm run generate"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Build Settings Verification

In Netlify dashboard, go to **Site settings** → **Build & deploy** → **Build settings**:

- **Base directory**: (leave empty)
- **Build command**: `npm run generate`
- **Publish directory**: `.output/public`
- **Functions directory**: `.output/server` (auto-detected for Nuxt 3)

---

## Step 3: Configure Environment Variables

### Required Variables: NONE ✅

The service works without any API credentials! It will use:
- RSS feeds (no auth required)
- Public APIs (no auth required)

### Recommended Variables (for better coverage)

Add these in Netlify dashboard:  
**Site settings** → **Build & deploy** → **Environment variables**

#### Twitter/X API (Recommended)
```
TWITTER_BEARER_TOKEN = your_bearer_token_here
```

**How to get**: https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens

**Benefits**:
- Access to more comprehensive tweet data
- Higher rate limits (450 requests/15 min)
- Better Dutch healthcare content coverage

#### Reddit API (Optional)
```
REDDIT_CLIENT_ID = your_client_id_here
REDDIT_CLIENT_SECRET = your_client_secret_here
REDDIT_USER_AGENT = zorg-sentiment/1.0
```

**How to get**: https://www.reddit.com/prefs/apps → Create App

**Benefits**:
- Access to r/Netherlands healthcare discussions
- Rate limit: 60 requests/minute

#### Mastodon API (Optional)
```
MASTODON_INSTANCE_URL = https://mastodon.nl
MASTODON_ACCESS_TOKEN = your_access_token_here
```

**How to get**: Mastodon instance → Preferences → Development → New Application

**Benefits**:
- Federated Dutch healthcare discussions
- Rate limit: 300 requests/5 minutes

#### Monitoring & Alerts (Optional)
```
ALERT_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to get**: 
- **Slack**: https://api.slack.com/messaging/webhooks
- **Discord**: Server Settings → Integrations → Webhooks
- **Teams**: Connector → Incoming Webhook

**Benefits**:
- Real-time alerts for critical failures
- Source health notifications
- Performance degradation warnings

### Adding Environment Variables

**Via Netlify Dashboard**:
1. Go to **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Key: `TWITTER_BEARER_TOKEN`
4. Value: (paste your token)
5. Scopes: Select "All" or specific deploy contexts
6. Click **Create variable**
7. Repeat for other variables

**Via Netlify CLI**:
```bash
# Set individual variables
netlify env:set TWITTER_BEARER_TOKEN "your_token_here"
netlify env:set REDDIT_CLIENT_ID "your_client_id"
netlify env:set REDDIT_CLIENT_SECRET "your_secret"

# Import from .env file
netlify env:import .env
```

---

## Step 4: Deploy!

### First Deployment

**If using Dashboard**:
- Click "Deploy site" (after Step 1)
- Netlify will:
  1. Clone your repository
  2. Install dependencies (`npm install`)
  3. Run build command (`npm run generate`)
  4. Publish `.output/public` directory
  5. Deploy serverless functions from `.output/server`

**If using CLI**:
```bash
# Deploy to production
netlify deploy --prod

# Or deploy preview first
netlify deploy
```

### Monitor Build Progress

1. Go to **Deploys** tab in Netlify dashboard
2. Watch real-time build log
3. Build should complete in **2-3 minutes**

### Expected Build Output

```
1:00:00 PM: Build ready to start
1:00:05 PM: Cloning repository...
1:00:10 PM: Installing dependencies
1:00:45 PM: Installing NPM modules using NPM version 10.8.2
1:01:30 PM: Running build command: npm run generate
1:01:35 PM: Nuxt 3.12.0 with Nitro 2.9.0
1:02:00 PM: Building client...
1:02:15 PM: Building server...
1:02:30 PM: Generating pages...
1:02:45 PM: ✓ Generated public site to .output/public
1:02:50 PM: Site is live ✨
```

### Common Build Issues

#### Issue 1: "Publish directory not found"
**Cause**: Wrong publish directory in `netlify.toml`  
**Solution**: Change `publish = "dist"` to `publish = ".output/public"`

#### Issue 2: "Command not found: nuxt"
**Cause**: Dependencies not installed correctly  
**Solution**: Ensure `nuxt` is in `dependencies`, not `devDependencies`

#### Issue 3: "Build exceeded memory limit"
**Cause**: Node.js heap size too small  
**Solution**: Add to `netlify.toml`:
```toml
[build.environment]
  NODE_OPTIONS = "--max-old-space-size=4096"
```

#### Issue 4: TypeScript errors during build
**Cause**: Strict type checking  
**Solution**: Verify all TypeScript files have no errors locally first:
```bash
npm run prepare:lint
npm run lint
```

---

## Step 5: Verify Deployment

### Check Site URL

After deployment, Netlify provides a URL:
- **Default**: `https://zorg-sentiment.netlify.app`
- **Custom**: `https://your-custom-domain.com` (if configured)

### Test API Endpoint

```bash
# Test sentiment API
curl https://zorg-sentiment.netlify.app/api/sentiment

# Expected response (200 OK):
{
  "current_score": 65,
  "sentiment_label": "Mixed",
  "trend_24h": [...],
  "spike": null,
  "topics": [...],
  "historical_context": {...},
  "data_quality": {...},
  "data_sources": [...]
}
```

### Test Dashboard

1. **Open site**: https://zorg-sentiment.netlify.app
2. **Verify display**:
   - ✅ Sentiment score visible (0-100)
   - ✅ Mood label shown (Bleak/Tense/Mixed/Upbeat/Sunny)
   - ✅ 24-hour trend chart rendered
   - ✅ Data freshness indicator present
   - ✅ No console errors

### Check Serverless Functions

Netlify automatically deploys Nuxt API routes as serverless functions:

**Functions dashboard**: Site settings → Functions

You should see:
- `___nuxt` (catch-all for Nuxt routes)
- Located in `.output/server/`

**Function logs**: Deploys → Functions → Select function → View logs

---

## Step 6: Setup Automated Refresh (Optional)

### Option 1: GitHub Actions (Recommended)

**Already configured in**: `.github/workflows/data-refresh.yml`

#### Setup Steps:

1. **Get Netlify Build Hook URL**:
   - Netlify dashboard → Site settings → Build & deploy → Build hooks
   - Click **Add build hook**
   - Name: `Data Refresh`
   - Branch: `002-sentiment-snapshot-service`
   - Click **Save**
   - Copy the webhook URL (e.g., `https://api.netlify.com/build_hooks/abc123xyz`)

2. **Add to GitHub Secrets**:
   - GitHub repository → Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `NETLIFY_BUILD_HOOK_URL`
   - Value: (paste webhook URL)
   - Click **Add secret**

3. **Verify Workflow**:
   - GitHub repository → Actions tab
   - You should see workflow: **Data Refresh**
   - Schedules:
     - Data rotation: Daily at 2 AM UTC
     - Site refresh: Every 15 minutes, 4-22 UTC (6 AM-midnight CET)

4. **Test Manual Trigger**:
   - Actions tab → Data Refresh workflow
   - Click **Run workflow** → Run workflow
   - Wait ~3 minutes, verify Netlify redeploys

### Option 2: External Cron Service

If you prefer not to use GitHub Actions:

**Services**:
- **cron-job.org** (free tier: 5 jobs)
- **EasyCron** (free tier: 10 jobs)
- **Zapier** (paid, easier UI)

**Setup**:
1. Create account on chosen service
2. Add new cron job:
   - URL: `https://api.netlify.com/build_hooks/YOUR_HOOK_ID`
   - Method: POST
   - Schedule: `*/15 * * * *` (every 15 minutes)
3. Add optional second job for data rotation (daily 2 AM)

See `docs/site-refresh-setup.md` for detailed comparison.

---

## Step 7: Custom Domain (Optional)

### Add Custom Domain

1. **Netlify dashboard** → Domain settings → Add custom domain
2. Enter your domain: `sentiment.yourdomain.com`
3. Follow DNS configuration instructions:

**Option A: Netlify DNS (easiest)**
- Transfer nameservers to Netlify
- Netlify manages all DNS records

**Option B: External DNS**
- Add CNAME record: `sentiment.yourdomain.com` → `zorg-sentiment.netlify.app`
- Or use Netlify DNS for subdomain only

4. **Enable HTTPS** (automatic with Netlify, uses Let's Encrypt)
5. **Wait for DNS propagation** (up to 24 hours)

---

## Step 8: Monitoring Setup

### Netlify Analytics (Paid)

**Enable**: Site settings → Analytics → Enable

**Metrics tracked**:
- Page views
- Unique visitors
- Top pages
- Bandwidth usage

**Cost**: $9/month per site

### External Monitoring (Free)

#### Option 1: Uptime Robot (Free)
1. Sign up: https://uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://zorg-sentiment.netlify.app/api/sentiment`
   - Interval: 5 minutes
   - Alert contacts: Your email
3. Alerts sent when API is down >5 min

#### Option 2: Better Uptime (Free)
1. Sign up: https://betteruptime.com
2. Create monitor:
   - URL: `https://zorg-sentiment.netlify.app/api/sentiment`
   - Interval: 3 minutes
   - Expected status: 200
   - Response time threshold: 3s (p95 target)

#### Option 3: Sentry (Error Tracking)
```bash
# Install Sentry
npm install @sentry/nuxt

# Configure in nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@sentry/nuxt/module'],
  sentry: {
    dsn: 'YOUR_SENTRY_DSN',
  },
})
```

See `docs/monitoring.md` for complete monitoring stack options.

---

## Step 9: Post-Deployment Validation

### Run Production Tests

```bash
# Test API endpoint
curl https://zorg-sentiment.netlify.app/api/sentiment | jq .

# Check response time
curl -w "\nTime: %{time_total}s\n" -o /dev/null https://zorg-sentiment.netlify.app/api/sentiment

# Expected: <3s (p95 target)
```

### Verify Contract Tests Against Production

```bash
# Update test to use production URL
# In tests/contract/sentiment-feed.test.ts
TEST_URL=https://zorg-sentiment.netlify.app npm run test:unit -- tests/contract/sentiment-feed.test.ts
```

### Check Function Logs

**Netlify Dashboard**:
1. Go to **Functions** tab
2. Click on `___nuxt` function
3. View real-time logs
4. Look for:
   - ✅ API requests completing successfully
   - ✅ Cache hits/misses
   - ✅ Source health status
   - ❌ Any errors or warnings

### Performance Validation

Run performance profiling against production:

```bash
# Update script to use production URL
# In scripts/profile-aggregator.mjs
TEST_URL=https://zorg-sentiment.netlify.app node scripts/profile-aggregator.mjs
```

**Expected results**:
- ✅ Response time p95 < 3s
- ✅ Cache hit < 50ms
- ✅ No memory leaks
- ✅ Concurrent requests handled

---

## Troubleshooting

### Issue: "Site not updating with latest data"

**Possible causes**:
1. Cache too aggressive
2. Automated refresh not configured
3. Data directory not being committed

**Solutions**:
1. Check cache TTL in composable (should be 5 min client-side, 15 min server-side)
2. Verify GitHub Actions workflow is running (check Actions tab)
3. Ensure `src/server/data/sentiment/*.json` files are committed to repo

### Issue: "API returns 503 Service Unavailable"

**Cause**: Insufficient data sources available

**Check**:
1. Function logs for source errors
2. Rate limit status for each source
3. API credentials (if configured)

**Solutions**:
1. Verify at least 2/5 sources are healthy
2. Check rate limits haven't been exceeded
3. Test source adapters individually in logs

### Issue: "High response times (>5s)"

**Possible causes**:
1. Cold start (first request after idle)
2. Too many sources timing out
3. Cache not working

**Solutions**:
1. Accept cold starts (5-10s) - subsequent requests fast
2. Check source timeouts in aggregator settings
3. Verify cache is being populated (check logs)
4. Consider upgrading Netlify plan for better performance

### Issue: "Environment variables not loading"

**Check**:
1. Variables are set in Netlify dashboard (not just locally)
2. Variable names match exactly (case-sensitive)
3. Redeploy site after adding variables
4. Check `nuxt.config.ts` runtimeConfig exposes variables

**Solution**:
```bash
# List all environment variables
netlify env:list

# Verify variable is set
netlify env:get TWITTER_BEARER_TOKEN
```

---

## Deployment Checklist

Use this checklist for each production deployment:

### Pre-Deployment ✅
- [ ] All tests passing locally (`npm run test:unit`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Build succeeds locally (`npm run generate`)
- [ ] Code reviewed and approved
- [ ] Branch merged to main (or deployment branch)

### Deployment ✅
- [ ] Netlify build settings configured correctly
- [ ] Environment variables set (if using API credentials)
- [ ] Build hook created (for automated refresh)
- [ ] GitHub secrets configured (NETLIFY_BUILD_HOOK_URL)

### Post-Deployment ✅
- [ ] Site accessible at production URL
- [ ] API endpoint returns valid JSON
- [ ] Dashboard displays sentiment data
- [ ] No console errors in browser
- [ ] Function logs show no errors
- [ ] Response time <3s (p95)
- [ ] Automated refresh working (if configured)
- [ ] Monitoring alerts configured

### Documentation ✅
- [ ] Deployment documented in team wiki
- [ ] Environment variables documented (without sensitive values)
- [ ] Monitoring dashboard URLs shared
- [ ] Incident response contacts updated

---

## Cost Estimation

### Netlify Free Tier (Adequate for MVP)
- **Build minutes**: 300/month (builds take ~3 min each)
  - Daily refresh: ~30 min/month ✅
  - Twice-daily refresh: ~60 min/month ✅
  - Every 15 min refresh: ~1,440 min/month ❌ (exceeds limit)
- **Bandwidth**: 100 GB/month
  - Estimated usage: ~5-10 GB/month ✅
- **Functions**: 125k invocations/month
  - Estimated: ~3k-5k/month ✅
- **Cost**: $0/month ✅

### Netlify Pro (Recommended for Production)
- **Build minutes**: 1,000/month
  - Every 15 min refresh: 1,440 min/month ⚠️ (close to limit)
- **Bandwidth**: 1 TB/month
- **Functions**: Unlimited
- **Analytics**: Included
- **Cost**: $19/month per member

### Netlify Business (High Traffic)
- **Build minutes**: 3,000/month
- **Bandwidth**: 2 TB/month
- **Functions**: Unlimited
- **Advanced analytics**: Included
- **Cost**: $99/month per member

**Recommendation**: Start with **Free tier**, upgrade to **Pro** when enabling 15-min refresh.

---

## Rollback Procedure

### If deployment fails or introduces bugs:

**Option 1: Rollback in Netlify Dashboard**
1. Go to **Deploys** tab
2. Find last known good deployment
3. Click **⋯** (three dots) → **Publish deploy**
4. Confirm rollback

**Option 2: Rollback via CLI**
```bash
# List recent deploys
netlify deploys:list

# Restore specific deploy
netlify deploy:restore DEPLOY_ID
```

**Option 3: Revert Git Commit**
```bash
# Revert last commit
git revert HEAD

# Push to trigger new deployment
git push origin 002-sentiment-snapshot-service
```

---

## Advanced Configuration

### Custom Headers

Add to `netlify.toml` for security:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Edge Functions (Beta)

For even faster global performance:

```toml
[[edge_functions]]
  function = "sentiment"
  path = "/api/sentiment"
```

See: https://docs.netlify.com/edge-functions/overview/

### Split Testing

Test new features with subset of users:

```toml
[[split-testing]]
  branch-a = "main"
  branch-b = "feature-branch"
  split = 0.9
```

---

## Security Checklist

Before deploying to production:

- [ ] All API keys in environment variables (not committed)
- [ ] `.env` and `.env.local` in `.gitignore`
- [ ] No sensitive data in client-side code
- [ ] HTTPS enforced (Netlify default)
- [ ] Security headers configured
- [ ] Rate limiting enabled on API routes
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies updated (no known vulnerabilities)

**Security review**: See `docs/security-review.md` (already approved ✅)

---

## Support & Resources

### Netlify Documentation
- Docs: https://docs.netlify.com/
- Status: https://www.netlifystatus.com/
- Community: https://answers.netlify.com/

### Project Documentation
- Quickstart: `specs/002-sentiment-snapshot-service/quickstart.md`
- API Contract: `specs/002-sentiment-snapshot-service/contracts/sentiment-feed.md`
- Monitoring: `docs/monitoring.md`
- Security: `docs/security-review.md`
- Refresh Setup: `docs/site-refresh-setup.md`

### Contact
- GitHub Issues: https://github.com/rowantervelde/zorg-sentiment/issues
- Repository: https://github.com/rowantervelde/zorg-sentiment

---

## Summary: Quick Deployment

**TL;DR** - 5 steps to production:

```bash
# 1. Fix netlify.toml (update publish directory)
# Change: publish = "dist"
# To: publish = ".output/public"

# 2. Push to GitHub
git add netlify.toml
git commit -m "fix: update Netlify publish directory"
git push origin 002-sentiment-snapshot-service

# 3. Connect to Netlify
# Go to: https://app.netlify.com/
# Click: Add new site → Import from Git → Select repo

# 4. Configure (optional)
# Add environment variables for API credentials
# Set TWITTER_BEARER_TOKEN for better coverage

# 5. Deploy!
# Netlify auto-deploys on git push
# Or click "Deploy site" in dashboard
```

**Result**: Live in 3 minutes! 🎉

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-17  
**Status**: ✅ READY FOR DEPLOYMENT
