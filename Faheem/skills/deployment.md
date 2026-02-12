# Deployment — General Checklist

## Pre-deployment Checklist
- [ ] All environment variables set
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] Core features tested manually
- [ ] Database migrations applied (if applicable)
- [ ] DNS configured (see `systems/domains.md`)
- [ ] SSL certificate will auto-provision

## Deployment Steps (Coolify)
1. Push to `main` branch (or deploy branch)
2. Coolify auto-deploys (if configured) or trigger manually
3. Watch build logs for errors
4. Verify the site loads at the domain
5. Test core user flows
6. Check SSL (https works)

## Post-deployment Checklist
- [ ] Site loads correctly
- [ ] All pages accessible
- [ ] Forms submit properly
- [ ] API endpoints responding
- [ ] Mobile responsive check
- [ ] Arabic RTL rendering correctly
- [ ] Performance acceptable (no massive load times)

## Rollback Plan
```bash
# If something breaks after deploy:

# Option 1: Revert commit and push
git revert HEAD && git push

# Option 2: Deploy previous commit in Coolify
# Go to Coolify dashboard → project → deploy specific commit

# Option 3: Docker rollback
docker stop <new_container>
docker start <old_container>
```

## Environment Variables Template
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=production

# API Keys (project-specific)
# [add per project]
```

## Performance Checks
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s
- [ ] No console errors
- [ ] Images optimized (next/image)

## Notes
- Always test the build locally before deploying
- Keep environment variables consistent between local and production
- If a deploy fails, check build logs first — 90% of issues are env vars or build errors
