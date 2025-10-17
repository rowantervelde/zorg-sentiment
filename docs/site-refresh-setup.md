# Site Refresh Setup Guide (T049)

This guide explains how to set up automated site refresh for the sentiment snapshot service.

## Overview

The site uses two automated schedules:

1. **Data Rotation**: Runs daily at 2 AM UTC to aggregate old hourly data into daily summaries
2. **Site Refresh**: Runs every 15 minutes during active hours (6 AM - midnight CET) to regenerate static site with latest sentiment data

## Option 1: GitHub Actions (Recommended)

### Setup Steps

1. **Create Netlify Build Hook**

   Go to Netlify dashboard:
   - Navigate to: Site settings → Build & deploy → Build hooks
   - Click "Add build hook"
   - Name: `Automated Refresh`
   - Branch: `main` (or your production branch)
   - Click "Save"
   - Copy the webhook URL (looks like: `https://api.netlify.com/build_hooks/XXXXX`)

2. **Add Secret to GitHub**

   Go to GitHub repository settings:
   - Navigate to: Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NETLIFY_BUILD_HOOK_URL`
   - Value: Paste the webhook URL from step 1
   - Click "Add secret"

3. **Enable GitHub Actions**

   The workflow file is already committed at `.github/workflows/data-refresh.yml`

   GitHub Actions will automatically:
   - Run data rotation at 2 AM UTC daily
   - Trigger Netlify builds every 15 minutes from 4 AM to 10 PM UTC (6 AM to midnight CET)

4. **Verify Setup**
   - Go to: Actions tab in GitHub repository
   - Check that workflow runs are scheduled
   - Manually trigger a test run:
     - Click "Data Rotation & Site Refresh"
     - Click "Run workflow"
     - Select branch and click "Run workflow"

### Manual Triggers

You can manually run jobs:

```bash
# Trigger via GitHub CLI
gh workflow run data-refresh.yml

# Or via API
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/data-refresh.yml/dispatches \
  -d '{"ref":"main"}'
```

---

## Option 2: External Cron Service

If you prefer not to use GitHub Actions, you can use an external cron service.

### Services to Consider

1. **cron-job.org** (Free tier available)
   - https://cron-job.org
   - Supports up to 50 cron jobs
   - Reliable execution

2. **EasyCron** (Free tier: 30 jobs)
   - https://www.easycron.com
   - Better UI than cron-job.org

3. **Cronhub** (Free tier: 5 monitors)
   - https://cronhub.io
   - Includes monitoring/alerting

### Setup with External Service

1. **Create Build Hook** (same as Option 1, step 1)

2. **Create Data Rotation Endpoint**

   Add a new API route: `src/server/api/admin/rotate-data.post.ts`

   ```typescript
   import { rotateData } from '~/scripts/rotate-data.mjs'

   export default defineEventHandler(async (event) => {
     // Optional: Add authentication
     const auth = getHeader(event, 'Authorization')
     const expectedToken = process.env.ADMIN_TOKEN

     if (auth !== `Bearer ${expectedToken}`) {
       throw createError({
         statusCode: 401,
         statusMessage: 'Unauthorized',
       })
     }

     try {
       await rotateData()
       return { success: true, message: 'Data rotation completed' }
     } catch (error) {
       throw createError({
         statusCode: 500,
         statusMessage: 'Data rotation failed',
         data: { error: error.message },
       })
     }
   })
   ```

3. **Configure Cron Jobs**

   In your chosen cron service, create two jobs:

   **Job 1: Data Rotation** (Daily at 2 AM UTC)
   - URL: `https://your-site.netlify.app/api/admin/rotate-data`
   - Method: POST
   - Schedule: `0 2 * * *`
   - Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`

   **Job 2: Site Refresh** (Every 15 min, 6 AM - midnight CET)
   - URL: `https://api.netlify.com/build_hooks/XXXXX`
   - Method: POST
   - Schedule: `*/15 6-23 * * *` (adjust for CET timezone)
   - No headers needed

4. **Add Admin Token**

   In Netlify environment variables:
   - Key: `ADMIN_TOKEN`
   - Value: Generate a secure random token
   - Example: `openssl rand -hex 32`

---

## Option 3: Netlify Functions + Scheduled Functions (Beta)

Netlify now supports scheduled functions (beta feature).

### Setup Steps

1. **Create Scheduled Function**

   Create file: `netlify/functions/scheduled-refresh.mts`

   ```typescript
   import type { Config } from '@netlify/functions'

   export default async (req: Request) => {
     // Trigger data rotation
     await fetch(`${process.env.URL}/api/admin/rotate-data`, {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
       },
     })

     return new Response('Scheduled refresh completed', { status: 200 })
   }

   export const config: Config = {
     schedule: '*/15 6-23 * * *',
   }
   ```

2. **Enable Scheduled Functions**

   In `netlify.toml`:

   ```toml
   [functions]
     directory = "netlify/functions"

   [[edge_functions]]
     function = "scheduled-refresh"
     path = "/.netlify/functions/scheduled-refresh"
   ```

3. **Deploy**

   Scheduled functions run automatically after deployment.

---

## Monitoring & Verification

### Check Site Refresh Status

```bash
# Check last build time
curl -s https://your-site.netlify.app/api/sentiment | jq '.data_quality.last_update'

# Verify data freshness
curl -s https://your-site.netlify.app/api/sentiment | jq '.data_quality.staleness_minutes'
# Should be < 30 minutes during active hours
```

### Check Data Rotation

```bash
# List daily aggregate files
ls -lh src/server/data/sentiment/daily-*.json

# Check file contents
cat src/server/data/sentiment/daily-2025-09.json | jq '.'
```

### GitHub Actions Logs

View execution logs:

1. Go to Actions tab
2. Click on workflow run
3. Click on job name
4. View step outputs

### Troubleshooting

**Site not refreshing?**

- Check GitHub Actions status (if using Option 1)
- Verify `NETLIFY_BUILD_HOOK_URL` secret is set
- Test webhook manually: `curl -X POST https://api.netlify.com/build_hooks/XXXXX`
- Check Netlify deploy logs

**Data rotation failing?**

- Check GitHub Actions logs for errors
- Verify bucket files exist in `src/server/data/sentiment/`
- Run script locally: `node scripts/rotate-data.mjs --dry-run`
- Check file permissions

**Builds triggered too frequently?**

- GitHub Actions schedule is in UTC, convert to CET properly
- Verify cron expression: `*/15 4-22 * * *` = 6 AM to midnight CET
- Use https://crontab.guru to validate

---

## Cost Analysis

### GitHub Actions

- **Free tier**: 2,000 minutes/month for public repos
- **Usage**: ~2 minutes per workflow run
- **Estimated runs**: 96 refreshes/day × 30 days = 2,880 runs
- **Total minutes**: 2,880 × 2 = 5,760 minutes/month
- **Cost**: ~$0.008/minute × 5,760 = **~$46/month** (exceeds free tier)

### Netlify Builds

- **Pro plan**: 300 build minutes/month included
- **Usage**: ~1 minute per build
- **Estimated builds**: ~2,880/month
- **Cost**: Included in Pro plan ($19/month) + overage ($7 per 500 minutes)
- **Total**: ~$19 + $35 = **~$54/month**

### External Cron Service

- **cron-job.org Pro**: $4.95/month (unlimited jobs)
- **EasyCron**: $2.99/month (100 jobs)
- **Netlify builds**: Same as above (~$54/month)
- **Total**: ~$58/month

### Recommendation

For cost optimization:

1. **Option 1 (GitHub Actions)** if you're already paying for GitHub Actions
2. **Option 2 (External cron)** if you want minimal complexity
3. **Option 3 (Netlify scheduled functions)** once it leaves beta

---

## Production Configuration

Add these to your deployment checklist:

- [ ] Netlify build hook created and tested
- [ ] GitHub Actions secret `NETLIFY_BUILD_HOOK_URL` configured
- [ ] Workflow enabled and first run successful
- [ ] Monitoring alerts configured (T050, T051)
- [ ] Data rotation tested with `--dry-run` flag
- [ ] Verify site refreshes during active hours
- [ ] Verify no refreshes outside active hours
- [ ] Check cost tracking in GitHub/Netlify dashboard
