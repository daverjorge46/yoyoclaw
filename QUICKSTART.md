# AI Agent Factory - Quick Start Guide

Get the template running in 5 minutes.

## Prerequisites

- Node.js 22+ 
- npm or pnpm
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/AI-Agent-Factory-Template.git
cd AI-Agent-Factory-Template
```

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and set the required variables:

```bash
# REQUIRED - Generate with: openssl rand -hex 32
JWT_SECRET=your-32-character-random-string

# REQUIRED - Generate with: node -e "console.log(require('bcryptjs').hashSync('YourPassword', 12))"
ADMIN_PASSWORD_HASH=$2b$12$your-bcrypt-hash

# REQUIRED - Generate with: openssl rand -hex 32
MASTER_ENCRYPTION_KEY=your-64-character-hex-string

# Optional - Nigerian Integrations
TERMII_API_KEY=your_termii_key
PAYSTACK_SECRET_KEY=sk_test_xxx
WHATSAPP_ACCESS_TOKEN=your_token
```

## Step 3: Install Dependencies

```bash
npm install
# or
pnpm install
```

## Step 4: Start the Gateway

```bash
npm run dev
# or
pnpm dev
```

The gateway will start on `http://localhost:18789`

## Step 5: Verify Installation

### Check Health Endpoint

```bash
curl http://localhost:18789/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 5000,
  "uptimeFormatted": "5s",
  "services": [
    { "name": "gateway", "status": "ok" },
    { "name": "auth", "status": "ok" },
    { "name": "encryption", "status": "ok" }
  ]
}
```

### Check Canvas Page

Open in browser: http://localhost:18789/__openclaw__/canvas/

You should see the OpenClaw Canvas test page. The "Bridge: missing" message is expected when viewing in a desktop browser (see below).

## Step 6: Run Tests

```bash
npm test
# or
pnpm test
```

All core tests should pass.

## Verification Checklist

- [ ] `/health` returns status "ok"
- [ ] Canvas page loads at `/__openclaw__/canvas/`
- [ ] `npm test` passes all tests
- [ ] No errors in console

## About the Canvas Page

The Canvas page shows "Bridge: missing" - this is **expected behavior**.

The Canvas is designed for mobile app integration (iOS/Android). When viewed in a desktop browser:
- The page loads correctly ✅
- But actions fail because there's no mobile bridge ✅

This is not an error. For your AI agent use case, you'll interact via:
- WhatsApp (Termii/Meta API)
- SMS (Termii)
- API endpoints (REST)
- Custom frontends you build

## Next Steps

1. **Configure Nigerian Integrations** - Add API keys for Termii, Paystack, WhatsApp
2. **Customize the Agent** - Modify agent behavior in `/src/agents/`
3. **Add Business Logic** - Create custom skills in `/skills/`
4. **Deploy** - See `DEPLOYMENT.md` for production deployment

## Troubleshooting

### Gateway won't start
- Check if port 18789 is in use: `netstat -an | grep 18789`
- Verify Node.js version: `node --version` (need 22+)

### Health shows "degraded"
- Missing environment variables - check `.env` file
- Integration API keys not configured (optional for basic testing)

### Tests fail
- Ensure gateway is running before running integration tests
- Check that `.env` has required variables

## Support

- Documentation: `/docs/`
- Security Guide: `SECURITY.md`
- Deployment Guide: `DEPLOYMENT.md`
- Integration Docs: `docs/INTEGRATIONS.md`
