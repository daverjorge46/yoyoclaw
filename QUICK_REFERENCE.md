# 🚀 Quick Reference Card - Voice Apps Security & Deployment

## 🔴 CRITICAL ALERTS

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  PETER: API KEYS EXPOSED - ROTATE IMMEDIATELY          │
│  🛑 VONFRANZ: DO NOT DEPLOY - CLIENT-SIDE API KEY ISSUE    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Peter - 5-Minute Emergency Fix

```bash
# 1. Rotate Keys (Hume Dashboard)
https://beta.hume.ai/settings/keys → Revoke → Create New

# 2. Update Local Env
cd ~/Projects/Peter
nano .env  # Add new keys

# 3. Deploy to Vercel
vercel login
vercel --prod

# 4. Add Environment Variables (Vercel Dashboard)
HUME_API_KEY=<new_key>
HUME_SECRET_KEY=<new_secret>
```

---

## 🛑 vonfranz - Deployment Blocker

```
❌ CURRENT (INSECURE):
   React App → Gemini API (key in browser)

✅ REQUIRED (SECURE):
   React App → Express Server → Gemini API
              (key on server)

🔧 ACTION: Follow vonfranz-backend-implementation.md
```

---

## 📁 Documentation Index

| File | Purpose | Lines |
|------|---------|-------|
| `EXECUTIVE_SUMMARY.md` | This file - Quick overview | 271 |
| `SECURITY_DEPLOYMENT_ASSESSMENT.md` | Full audit & analysis | 512 |
| `security-fixes/peter-deployment-guide.md` | Peter step-by-step | 495 |
| `security-fixes/vonfranz-backend-implementation.md` | vonfranz backend | 611 |

**Location**: `~/Projects/`

---

## ⏱️ Time Estimates

### Peter
- Emergency Fix: **15 minutes**
- Full Deployment: **2 hours**
- Security Hardening: **4 hours**

### vonfranz
- Backend Implementation: **8-16 hours**
- Testing & Integration: **4-8 hours**
- Deployment: **2-4 hours**

---

## 💰 Monthly Costs (Production)

```
Peter (Vercel):
├─ Light use:    $0-20/month
└─ Heavy use:    $100-500/month

vonfranz (Railway + Gemini):
├─ Light use:    $5-25/month
└─ Heavy use:    $50-200/month
```

---

## 🎯 Priority Matrix

```
┌──────────┬─────────────────────────────────────────────┐
│ Priority │ Task                                        │
├──────────┼─────────────────────────────────────────────┤
│   P1     │ Peter: Rotate API keys                      │
│   P1     │ Peter: Clean git history                    │
│   P1     │ vonfranz: Block deployment                  │
│   P1     │ vonfranz: Implement backend                 │
├──────────┼─────────────────────────────────────────────┤
│   P2     │ Both: Add security headers                  │
│   P2     │ Both: Set up monitoring                     │
│   P2     │ Peter: Deploy to Vercel                     │
├──────────┼─────────────────────────────────────────────┤
│   P3     │ Both: CI/CD pipeline                        │
│   P3     │ Both: Performance optimization              │
│   P3     │ vonfranz: Deploy to Railway                 │
└──────────┴─────────────────────────────────────────────┘
```

---

## 🔧 Essential Commands

### Peter

```bash
# Local Development
npm install
npm run dev                    # http://localhost:3000

# Production Build
npm run build
npm run start

# Vercel Deployment
vercel login
vercel                         # Deploy preview
vercel --prod                  # Deploy production
vercel logs                    # View logs
vercel env ls                  # List env vars
```

### vonfranz (After Backend)

```bash
# Start Backend
cd server
npm install
npm run dev                    # http://localhost:3001

# Start Frontend (separate terminal)
cd ..
npm install
npm run dev                    # http://localhost:3000

# Production
docker-compose up             # If using Docker
railway up                    # If using Railway
```

---

## 🔒 Security Checklist

```
Peter:
[ ] API keys rotated
[ ] .env in .gitignore
[ ] Git history cleaned
[ ] Vercel env vars set
[ ] Security headers added
[ ] HTTPS enforced
[ ] Monitoring configured

vonfranz:
[ ] Backend implemented
[ ] API key server-side only
[ ] CORS configured
[ ] Rate limiting added
[ ] WebSocket secured
[ ] Error handling complete
[ ] Production ready
```

---

## 🆘 Troubleshooting Quick Fixes

### Peter Issues

```
Problem: "Unable to get access token"
Fix: Check Vercel env variables are set

Problem: Build fails
Fix: rm -rf .next && npm run build

Problem: Voice doesn't connect
Fix: Verify Hume API keys are valid
```

### vonfranz Issues

```
Problem: API key undefined
Fix: Check .env file exists and is loaded

Problem: CORS error
Fix: Add origin to CORS config in server

Problem: Audio doesn't stream
Fix: Implement WebSocket connection
```

---

## 📊 Health Check URLs

```bash
# After Deployment

Peter:
https://your-peter-app.vercel.app/api/health

vonfranz (after implementation):
https://your-vonfranz-app.railway.app/health
```

---

## 🎓 Key Takeaways

1. **API Keys**
   - ❌ Never in client code
   - ❌ Never in git
   - ✅ Always server-side
   - ✅ Always in env vars

2. **Deployment**
   - ✅ Test locally first
   - ✅ Use platform env vars
   - ✅ Monitor from day one
   - ✅ Have rollback plan

3. **Security**
   - ✅ HTTPS only
   - ✅ Security headers
   - ✅ Rate limiting
   - ✅ Regular audits

---

## 📞 Support Resources

- Peter Guide: `security-fixes/peter-deployment-guide.md`
- vonfranz Guide: `security-fixes/vonfranz-backend-implementation.md`
- Full Assessment: `SECURITY_DEPLOYMENT_ASSESSMENT.md`

**All files in**: `~/Projects/`

---

## 🚦 Status Indicators

```
Peter:
├─ Security:    🔴 CRITICAL (needs immediate attention)
├─ Code:        🟢 GOOD
├─ Deploy:      🟡 READY (after key rotation)
└─ Monitoring:  🔴 MISSING

vonfranz:
├─ Security:    🔴 BLOCKING (deployment blocked)
├─ Code:        🟢 GOOD
├─ Deploy:      🔴 NOT READY (backend needed)
└─ Monitoring:  🔴 MISSING
```

---

## ⚡ Next Steps

1. **Immediate** (Today):
   - Rotate Peter's API keys
   - Block vonfranz deployment

2. **This Week**:
   - Deploy Peter to Vercel
   - Start vonfranz backend

3. **This Month**:
   - Complete vonfranz implementation
   - Add monitoring to both
   - Security hardening

---

**Last Updated**: January 11, 2025  
**Status**: ✅ Assessment Complete | 🔴 Critical Actions Required
