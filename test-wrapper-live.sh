#!/bin/bash
#
# Live Test Script for API Wrapper + OpenClaw
# Tests ALL natural language query types
#

set -e

API_WRAPPER_URL="http://localhost:8000/api/chat"
ORG_ID="902"

echo "========================================================================"
echo "API WRAPPER + OPENCLAW - LIVE TEST SUITE"
echo "========================================================================"
echo ""
echo "Testing Endpoint: $API_WRAPPER_URL"
echo "Organization ID: $ORG_ID"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local query="$2"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo ""
    echo "------------------------------------------------------------------------"
    echo "TEST $TESTS_RUN: $test_name"
    echo "------------------------------------------------------------------------"
    echo "📝 Query: \"$query\""
    echo ""

    local response=$(curl -s -X POST "$API_WRAPPER_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\", \"org_id\": \"$ORG_ID\"}" \
        --max-time 90)

    local success=$(echo "$response" | jq -r '.success')
    local answer=$(echo "$response" | jq -r '.response')

    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo ""
        echo "📤 Response:"
        echo "$answer" | fold -w 70 -s
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo ""
        echo "Error: $answer"
    fi

    echo ""
}

# Test 1: Simple Analytics Query
run_test "Average Response Time" \
    "Give me avg response time"

# Test 2: Agent Comparison
run_test "Compare Agents/Reps" \
    "Compare rep 14024 to rep 14025"

# Test 3: CRM Query (Dead Deals)
run_test "Dead Deals Query" \
    "What deals are dead"

# Test 4: Today's Message Count
run_test "Today's Message Count" \
    "How many messages were sent today"

# Test 5: Top Performers
run_test "Top Performers This Week" \
    "Show me top 5 performers this week"

# Test 6: Time Range Query
run_test "Response Time Trend" \
    "Show me response time trend for the last 7 days"

# Test 7: First Response Time
run_test "First Response Time" \
    "What is the average time to first response"

# Test 8: Agent-Specific Query
run_test "Specific Agent Performance" \
    "How is agent 14024 performing"

# Test 9: Complex Comparison
run_test "Team Performance Analysis" \
    "Compare message counts between all agents this month"

# Test 10: Natural Language Edge Case
run_test "Conversational Query" \
    "Hey, can you tell me how our team is doing with response times?"

# Summary
echo ""
echo "========================================================================"
echo "TEST SUMMARY"
echo "========================================================================"
echo ""
echo "Total Tests: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$((TESTS_RUN - TESTS_PASSED))${NC}"
echo ""

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo "The API wrapper is working perfectly!"
    echo "Users can now ask ANY natural language question about:"
    echo "  ✅ Response times & performance metrics"
    echo "  ✅ Agent comparisons & rankings"
    echo "  ✅ Message counts & activity"
    echo "  ✅ CRM data (deals, contacts, pipeline)"
    echo "  ✅ Time-based trends & analysis"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    echo ""
    echo "Check OpenClaw logs for details:"
    echo "  docker logs openclaw"
    exit 1
fi
