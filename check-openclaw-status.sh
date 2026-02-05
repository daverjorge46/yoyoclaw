#!/bin/bash
#
# Check OpenClaw Deployment Status
#

OPENCLAW_URL="http://ywgssocsg44kckkgsgg0gssk.5.161.117.36.sslip.io"
TOKEN="103442901b9684c231b41e31c2b938525025bf71020305a0e5a6f31dd015ccc4"

echo "========================================================================"
echo "OPENCLAW STATUS CHECK"
echo "========================================================================"
echo ""
echo "URL: $OPENCLAW_URL"
echo ""

# Test 1: Basic connectivity
echo "1️⃣  Testing basic connectivity..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$OPENCLAW_URL" > /dev/null 2>&1; then
    echo "   ✅ Server is reachable"
else
    echo "   ❌ Server is not reachable"
    exit 1
fi

# Test 2: Health endpoint
echo ""
echo "2️⃣  Testing health endpoint..."
health_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$OPENCLAW_URL/health")
if [ "$health_status" = "200" ]; then
    echo "   ✅ Health check passed (200 OK)"
elif [ "$health_status" = "404" ]; then
    echo "   ⚠️  Health endpoint not found (404) - trying chat completions..."
else
    echo "   ❌ Health check failed (HTTP $health_status)"
fi

# Test 3: Chat completions endpoint
echo ""
echo "3️⃣  Testing /v1/chat/completions endpoint..."
chat_response=$(curl -s -X POST "$OPENCLAW_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Organization-Id: 902" \
    -H "X-Workspace-Id: default-workspace" \
    -d '{"model":"openclaw","messages":[{"role":"user","content":"ping"}]}' \
    --max-time 10 2>&1)

if echo "$chat_response" | grep -q "choices"; then
    echo "   ✅ Chat completions endpoint is working"
    echo ""
    echo "========================================================================"
    echo "STATUS: ONLINE ✅"
    echo "========================================================================"
    echo ""
    echo "OpenClaw is ready! You can now test the API wrapper:"
    echo ""
    echo "  bash test-wrapper-live.sh"
    echo ""
    exit 0
elif echo "$chat_response" | grep -q "404"; then
    echo "   ❌ Endpoint not found (404)"
    echo ""
    echo "========================================================================"
    echo "STATUS: OFFLINE ❌"
    echo "========================================================================"
    echo ""
    echo "OpenClaw container appears to be down or not properly configured."
    echo ""
    echo "To check container status (requires server access):"
    echo "  docker ps -a | grep openclaw"
    echo "  docker logs openclaw"
    echo ""
    echo "To restart OpenClaw (requires server access):"
    echo "  docker-compose -f docker-compose.coolify.yml restart openclaw"
    exit 1
else
    echo "   ⚠️  Unexpected response"
    echo "   Response: ${chat_response:0:200}..."
    echo ""
    echo "========================================================================"
    echo "STATUS: UNKNOWN ⚠️"
    echo "========================================================================"
    exit 1
fi
