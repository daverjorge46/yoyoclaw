# Coolify — Deployment Notes

## Instance
- **URL:** _[dashboard URL]_
- **Server:** _[IP from systems/servers.md]_
- **Version:** _[version]_

## Deployed Projects
| Project | Domain | Type | Branch | Auto-deploy? | Status |
|---------|--------|------|--------|-------------|--------|
| _[project]_ | _[domain]_ | _[Next.js/static/etc]_ | _[main]_ | _[yes/no]_ | _[running]_ |

## Common Operations
```bash
# SSH into server
ssh user@IP

# Check running containers
docker ps

# View logs for a specific container
docker logs <container_name> --tail 100 -f

# Restart a service
docker restart <container_name>

# Check disk space (Coolify can eat disk)
df -h
docker system df

# Clean up unused images
docker system prune -a
```

## New Project Deployment Checklist
1. [ ] Create project in Coolify dashboard
2. [ ] Connect GitHub repo
3. [ ] Set environment variables
4. [ ] Configure domain + SSL
5. [ ] Set build command and start command
6. [ ] Test deployment
7. [ ] Verify domain resolves correctly
8. [ ] Update `systems/domains.md` with DNS records

## Environment Variables Pattern
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App-specific
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
```

## Troubleshooting
| Problem | Solution |
|---------|---------|
| Build fails | Check build logs, verify env vars, check Node version |
| Domain not resolving | Verify DNS A record points to server IP, wait for propagation |
| SSL not working | Let Coolify auto-provision, check Traefik logs |
| Out of disk | `docker system prune -a`, check log rotation |
| Container keeps restarting | Check container logs, memory limits |

## Gotchas
- _[Things that tripped you up — add as you learn]_
- _[Coolify-specific quirks]_

## Resources
- Coolify docs: https://coolify.io/docs
