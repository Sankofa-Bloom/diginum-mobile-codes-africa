# DigiNum Deployment Guide

## Version Control & Deployment Strategy

DigiNum uses semantic versioning and automated deployment workflows for reliable releases.

## Quick Deployment Commands

### Staging Deployment
```bash
npm run deploy:staging
```
This creates a preview deployment without version bumping.

### Production Deployments

#### Patch Release (1.0.0 → 1.0.1)
```bash
npm run deploy:production
```
Use for bug fixes and small updates.

#### Minor Release (1.0.0 → 1.1.0)
```bash
npm run deploy:prod:minor
```
Use for new features that are backward compatible.

#### Major Release (1.0.0 → 2.0.0)
```bash
npm run deploy:prod:major
```
Use for breaking changes.

## Manual Deployment Process

If you prefer manual control:

```bash
# 1. Update version
npm version patch|minor|major

# 2. Push changes and tags
git push && git push --tags

# 3. Build and deploy
npm run build
netlify deploy --prod
```

## Environment Contexts

### Production (`main` branch)
- **URL**: https://diginum.netlify.app
- **Trigger**: Push to `main` branch or version tags
- **Environment**: `production`
- **Features**: Full functionality, analytics enabled

### Deploy Preview (Pull Requests)
- **URL**: Auto-generated preview URLs
- **Trigger**: Pull requests to `main`
- **Environment**: `staging`
- **Features**: Full functionality for testing

### Branch Deployments
- **URL**: Auto-generated branch URLs
- **Trigger**: Push to feature branches
- **Environment**: `development`
- **Features**: Development features enabled

## Version Information

The application automatically displays version information in the footer:
- **Version number** from package.json
- **Git commit hash** (short)
- **Build date** and environment

## GitHub Actions Workflow

The project includes automated workflows:

1. **Linting** - Code quality checks
2. **Building** - Application compilation
3. **Testing** - Automated tests
4. **Deployment** - Automated Netlify deployment
5. **Releases** - GitHub release creation for version tags

## Environment Variables

### Required Netlify Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional GitHub Secrets (for automation)
- `NETLIFY_AUTH_TOKEN` - For GitHub Actions deployment
- `NETLIFY_SITE_ID` - Your Netlify site ID

## Rollback Strategy

### Using Netlify Dashboard
1. Go to Netlify Dashboard → Deploys
2. Select a previous successful deployment
3. Click "Publish deploy"

### Using CLI
```bash
# List recent deployments
netlify api listSiteDeploys --data='{"site_id":"YOUR_SITE_ID"}'

# Rollback to specific deployment
netlify api restoreSiteDeploy --data='{"site_id":"YOUR_SITE_ID","deploy_id":"DEPLOY_ID"}'
```

### Using Git Tags
```bash
# Checkout previous version
git checkout v1.0.0

# Deploy that version
npm run build
netlify deploy --prod
```

## Monitoring & Health Checks

### Health Endpoints
- **Frontend**: https://diginum.netlify.app
- **API Health**: https://diginum.netlify.app/.netlify/functions/api/health
- **Build Status**: Check Netlify dashboard

### Version Verification
After deployment, verify the version in the footer matches your expected release.

## Troubleshooting

### Build Failures
1. Check node version compatibility
2. Clear caches: `rm -rf node_modules package-lock.json && npm install`
3. Verify environment variables

### Function Deployment Issues
1. Check function logs in Netlify dashboard
2. Verify environment variables are set
3. Test functions locally: `netlify dev`

### Cache Issues
1. Use `--skip-functions-cache` flag
2. Clear browser cache
3. Use incognito mode for testing

## Security Considerations

- Never commit secrets to repository
- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor for security vulnerabilities

## Support

For deployment issues:
1. Check this guide
2. Review Netlify build logs
3. Contact support via GitHub issues