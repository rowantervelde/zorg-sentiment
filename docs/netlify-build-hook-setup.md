# Netlify Build Hook Setup

This guide explains how to set up the `NETLIFY_BUILD_HOOK_URL` secret required for automated site refreshes.

## Why This Is Needed

The GitHub Actions workflow `.github/workflows/data-refresh.yml` triggers Netlify builds every 15 minutes to refresh your static site with the latest sentiment data. Without this secret, the workflow will fail with:

```
❌ NETLIFY_BUILD_HOOK_URL secret is not set.
```

## Setup Instructions

### Step 1: Create a Netlify Build Hook

1. **Log in to Netlify**
   - Go to https://app.netlify.com/
   - Select your `zorg-sentiment` site

2. **Navigate to Build Hooks**
   - Click **Site settings** (in the top navigation)
   - Go to **Build & deploy** → **Build hooks** (in the left sidebar)

3. **Add a new build hook**
   - Click **Add build hook** button
   - **Name**: `Automated Refresh` (or any descriptive name)
   - **Branch to build**: `main` (or your production branch)
   - Click **Save**

4. **Copy the webhook URL**
   - You'll see a URL like: `https://api.netlify.com/build_hooks/65abc123def456789`
   - **Copy this entire URL** (you'll need it in the next step)

### Step 2: Add Secret to GitHub

1. **Go to your GitHub repository**
   - Navigate to https://github.com/rowantervelde/zorg-sentiment

2. **Open repository settings**
   - Click **Settings** (top navigation)
   - Go to **Secrets and variables** → **Actions** (in the left sidebar)

3. **Create a new repository secret**
   - Click **New repository secret** button
   - **Name**: `NETLIFY_BUILD_HOOK_URL` (must match exactly)
   - **Secret**: Paste the webhook URL from Step 1
   - Click **Add secret**

### Step 3: Verify Setup

1. **Test the workflow manually**
   - Go to the **Actions** tab in your GitHub repository
   - Select **Data Rotation & Site Refresh** workflow
   - Click **Run workflow** dropdown
   - Select your branch and click **Run workflow**

2. **Check the logs**
   - Wait a few seconds for the workflow to start
   - Click on the running workflow
   - Click on the **Trigger Netlify Build** job
   - You should see: `✅ Netlify build hook triggered`

3. **Verify Netlify received the trigger**
   - Go to your Netlify dashboard
   - Click on **Deploys** tab
   - You should see a new deploy in progress with trigger: "Deploy hook"

## Troubleshooting

### Error: "curl: (2) no URL specified"

This means the secret is not set or is empty.

**Solution**: Follow Step 2 above to add the `NETLIFY_BUILD_HOOK_URL` secret.

### Error: "Context access might be invalid: NETLIFY_BUILD_HOOK_URL"

This is a **linter warning** in your IDE, not an error. GitHub Actions will still work correctly once the secret is added.

**Why it happens**: The linter can't verify that the secret exists in your repository settings.

**Solution**: Ignore this warning, or add the secret (Step 2) to make it go away.

### Error: "curl: (22) The requested URL returned error: 404"

The build hook URL is incorrect or the hook was deleted from Netlify.

**Solution**:

1. Go to Netlify → Site settings → Build & deploy → Build hooks
2. Check if the hook exists
3. If not, create a new one (Step 1)
4. Update the secret with the new URL (Step 2)

### Error: "curl: (6) Could not resolve host"

Network connectivity issue or malformed URL.

**Solution**:

- Verify the URL starts with `https://api.netlify.com/build_hooks/`
- Check that the entire URL was copied (no spaces or line breaks)

### Builds triggering but site not updating

The build hook is working, but your static site may not be fetching fresh data.

**Solution**:

- Check that your `nuxt.config.ts` uses `preset: 'netlify'` for production builds
- Verify API routes in `src/server/api/` are deployed as Netlify Functions
- Check Netlify deploy logs for errors during build

## Schedule Information

Once set up, the workflow will automatically:

- **Refresh site**: Every 15 minutes from 6 AM to midnight CET (4 AM - 10 PM UTC)
- **Rotate data**: Daily at 2 AM UTC (cleans up old hourly data)

You can also trigger builds manually through the Actions tab.

## Cost Considerations

- **GitHub Actions**: ~2 minutes per workflow run
- **Netlify Builds**: ~1-2 minutes per build
- **Frequency**: ~72 builds per day (15-minute intervals during active hours)

This may exceed free tier limits. Monitor your usage in:

- GitHub: Settings → Billing → Actions usage
- Netlify: Site dashboard → Usage

Consider adjusting the refresh frequency in `.github/workflows/data-refresh.yml` if needed:

```yaml
# Example: Every 30 minutes instead of 15
- cron: '*/30 4-22 * * *'
```

## Security Notes

- ✅ The build hook URL is **not sensitive** (it can only trigger builds, not access data)
- ✅ Still stored as a secret to keep it out of public logs
- ✅ Anyone with the URL can trigger builds (but that's usually not a concern)
- ⚠️ If you suspect abuse, regenerate the build hook in Netlify and update the secret

## Related Documentation

- [Site Refresh Setup Guide](./site-refresh-setup.md)
- [Netlify Deployment Fix](./netlify-deployment-fix.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Build Hooks Documentation](https://docs.netlify.com/configure-builds/build-hooks/)
