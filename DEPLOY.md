# 🚀 Netlify Deployment - Quick Checklist

**Status**: Ready to deploy ✅  
**Estimated Time**: 5 minutes

---

## Pre-Flight Check

✅ **Code Quality**

- [x] All 56 tasks complete (100%)
- [x] 146 tests written
- [x] Build succeeds locally
- [x] No TypeScript errors
- [x] Security review passed

✅ **Configuration**

- [x] `netlify.toml` configured (publish: `.output/public`)
- [x] Environment variables documented
- [x] `.gitignore` excludes sensitive files

---

## Deployment Steps

### 1️⃣ Fix Netlify Configuration (DONE ✅)

The `netlify.toml` has been updated with the correct publish directory:

```toml
[build]
  command = "npm run generate"
  publish = ".output/public"  # ✅ Fixed (was "dist")
```

### 2️⃣ Commit and Push

```bash
cd c:\git\github\zorg-sentiment

# Stage the netlify.toml fix
git add netlify.toml

# Commit
git commit -m "fix: update Netlify publish directory for Nuxt 3"

# Push to GitHub
git push origin 002-sentiment-snapshot-service
```

### 3️⃣ Connect to Netlify

**Option A: Via Dashboard** (Easiest)

1. Go to: https://app.netlify.com/
2. Click: **"Add new site"** → **"Import an existing project"**
3. Select: **GitHub**
4. Choose repository: **rowantervelde/zorg-sentiment**
5. Choose branch: **002-sentiment-snapshot-service**
6. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run generate` ✅
   - Publish directory: `.output/public` ✅
7. Click: **"Deploy site"**

**Option B: Via CLI** (Faster if you have CLI installed)

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login
netlify login

# Initialize and deploy
netlify init

# Deploy to production
netlify deploy --prod
```

### 4️⃣ Monitor Deployment

Watch the build log in Netlify dashboard:

- Expected duration: **2-3 minutes**
- Look for: "Site is live ✨"

### 5️⃣ Verify Deployment

**Test API endpoint:**

```bash
# Replace with your actual Netlify URL
curl https://zorg-sentiment.netlify.app/api/sentiment

# Expected: 200 OK with JSON response
```

**Test Dashboard:**

1. Open: https://zorg-sentiment.netlify.app
2. Verify:
   - ✅ Sentiment score displays (0-100)
   - ✅ Mood label shows
   - ✅ Trend chart renders
   - ✅ No console errors

---

## Optional: Add Environment Variables

**All credentials are optional!** The service works without them.

For better data coverage, add in Netlify dashboard:
**Site settings** → **Environment variables**

### Twitter API (Recommended)

```
TWITTER_BEARER_TOKEN = your_token_here
```

Get at: https://developer.twitter.com/en/portal/dashboard

### Reddit API (Optional)

```
REDDIT_CLIENT_ID = your_client_id
REDDIT_CLIENT_SECRET = your_secret
REDDIT_USER_AGENT = zorg-sentiment/1.0
```

Get at: https://www.reddit.com/prefs/apps

### Alert Webhook (Optional)

```
ALERT_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Get at: Slack → Apps → Incoming Webhooks

**After adding variables**: Trigger a new deploy (Settings → Deploys → Trigger deploy)

---

## Optional: Setup Automated Refresh

### Enable GitHub Actions Workflow

**Already configured in**: `.github/workflows/data-refresh.yml`

**Steps**:

1. **Get Netlify Build Hook**:
   - Netlify dashboard → Site settings → Build & deploy → Build hooks
   - Click **"Add build hook"**
   - Name: `Data Refresh`
   - Branch: `002-sentiment-snapshot-service`
   - Save and copy the URL

2. **Add to GitHub Secrets**:
   - GitHub repo → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NETLIFY_BUILD_HOOK_URL`
   - Value: (paste webhook URL)
   - Click **"Add secret"**

3. **Verify Workflow**:
   - GitHub → Actions tab
   - Should see: **Data Refresh** workflow
   - Schedule: Every 15 min, 6 AM-midnight CET

---

## Troubleshooting

### Issue: "Publish directory not found"

**Cause**: Wrong directory in netlify.toml  
**Fix**: Already fixed! (changed to `.output/public`)

### Issue: Build fails with "Command not found: nuxt"

**Cause**: Dependencies not installed  
**Fix**: Netlify auto-installs from package.json (should work automatically)

### Issue: API returns 503

**Cause**: Insufficient data sources (need 2/5 minimum)  
**Fix**:

1. Check function logs in Netlify
2. Add API credentials (Twitter recommended)
3. Wait for sources to become available

### Issue: Slow response times (>5s)

**Cause**: Cold start (function was idle)  
**Fix**:

- First request after idle: 5-10s (normal)
- Subsequent requests: <3s (cached)
- Consider Netlify Pro for better performance

---

## Cost Summary

### Free Tier (Good for MVP)

- Build minutes: 300/month
- Bandwidth: 100 GB/month
- Functions: 125k invocations/month
- **Cost**: $0/month ✅

**Recommendation**: Start with free tier, upgrade to Pro ($19/month) when enabling 15-min automated refresh.

---

## Success Criteria

After deployment, verify:

- ✅ Site accessible at Netlify URL
- ✅ API endpoint returns valid JSON
- ✅ Dashboard displays sentiment data
- ✅ Response time <3s (p95)
- ✅ No errors in function logs
- ✅ Automated refresh working (if configured)

---

## Next Steps After Deployment

1. **Add custom domain** (optional)
   - Netlify dashboard → Domain settings → Add custom domain

2. **Setup monitoring** (recommended)
   - Uptime Robot (free): https://uptimerobot.com
   - Better Uptime (free): https://betteruptime.com

3. **Enable analytics** (optional)
   - Netlify Analytics: $9/month
   - Or use Google Analytics (free)

4. **Merge to main branch** (when ready)

   ```bash
   git checkout main
   git merge 002-sentiment-snapshot-service
   git push origin main
   ```

5. **Update deployment branch** in Netlify to `main`

---

## Resources

- 📘 **Full Guide**: `docs/NETLIFY-DEPLOYMENT.md`
- 📘 **Monitoring Setup**: `docs/monitoring.md`
- 📘 **Site Refresh**: `docs/site-refresh-setup.md`
- 📘 **Security Review**: `docs/security-review.md`
- 📘 **Project Completion**: `docs/PROJECT-COMPLETION.md`

---

## Quick Deploy Command Summary

```bash
# 1. Commit netlify.toml fix
git add netlify.toml
git commit -m "fix: update Netlify publish directory"
git push origin 002-sentiment-snapshot-service

# 2. Deploy via Netlify CLI (if installed)
netlify login
netlify init
netlify deploy --prod

# 3. Or via Dashboard
# Go to: https://app.netlify.com/
# Import project from GitHub
```

---

**Ready to deploy! 🚀**

**Deployment time**: ~3 minutes  
**Status**: All green ✅  
**Confidence**: High ✅
