# Playwright Tests with Netlify Functions Fix

**Date**: October 19, 2025  
**Status**: ✅ Resolved

## Problem

After migrating to Netlify Functions (preset: `netlify`), Playwright tests failed with:

```
ERROR  ENOENT: no such file or directory, open 'C:\git\github\zorg-sentiment\.netlify\functions-internal\server\server.json'
```

The issue occurred because:

1. Playwright tests require a static build to serve with `npx serve`
2. The `pretest:playwright` script ran `npm run generate`
3. With `preset: 'netlify'`, the generate command tried to build for Netlify (not static)
4. The Netlify preset requires directories that don't exist in the test environment

## Solution

Implemented environment-based preset configuration:

### 1. Dynamic Preset in `nuxt.config.ts`

```typescript
nitro: {
  preset: process.env.NUXT_PRESET || 'netlify'
}
```

This allows:

- **Default**: Uses `netlify` preset for production deployments
- **Testing**: Can override with `NUXT_PRESET=static` for tests

### 2. Updated `pretest:playwright` Script

```json
"pretest:playwright": "cross-env NUXT_PRESET=static npm run generate"
```

- Uses `cross-env` for cross-platform environment variable setting
- Forces static build for Playwright tests
- Works on Windows, macOS, and Linux

### 3. Added `cross-env` Dependency

```bash
npm install --save-dev cross-env
```

## Build Behavior

| Command                   | Preset             | Output                         | Use Case                         |
| ------------------------- | ------------------ | ------------------------------ | -------------------------------- |
| `npm run build`           | `netlify`          | `.output/` with functions      | Production deployment to Netlify |
| `npm run generate`        | `netlify`          | Error (needs static for serve) | ❌ Don't use directly            |
| `npm run test:playwright` | `static` (via env) | `.output/public/` static files | ✅ Testing with serve            |
| `npm run dev`             | N/A                | Dev server                     | Local development                |

## Verification

Tests now pass successfully:

```bash
npm run test:playwright
```

Output:

```
✓ Building for Nitro preset: static
✓ Generated public .output/public
✓ 1 passed (4.6s)
```

## Benefits

✅ **Playwright tests work** - Static build generated for testing  
✅ **Netlify deployment works** - Uses serverless functions in production  
✅ **No code duplication** - Single config file handles both cases  
✅ **Cross-platform** - Works on Windows, macOS, Linux via `cross-env`

## Related Files

- `nuxt.config.ts` - Dynamic preset configuration
- `package.json` - Updated pretest:playwright script
- `playwright.config.ts` - Serves static build at `http://127.0.0.1:4173`

## Future Considerations

If you need to test serverless functions locally with Playwright:

1. Use Netlify Dev: `netlify dev`
2. Update `playwright.config.ts` webServer command
3. Point tests to `http://localhost:8888` (Netlify Dev default)

For now, the static build approach is sufficient since:

- API routes are mocked in tests (`page.route()`)
- Real integration testing happens via vitest integration tests
- Smoke tests verify UI rendering and interactions
