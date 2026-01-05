#!/bin/bash

QUERIES=(
  "Current weather in Tokyo"
  "Best restaurants in Paris 2026"
  "NVIDIA stock analysis Jan 2026"
  "Recent breakthroughs in quantum computing"
  "Winners of the latest Cannes Film Festival"
  "Status of the Artemis mission 2026"
  "Top 3 AI models in Jan 2026"
  "Current Prime Minister of UK"
  "Latest news on James Webb Space Telescope"
  "Latest news on Taylor Swift"
)

LOG_DIR="tests/e2e_web_search_results"
mkdir -p "$LOG_DIR"

echo "Starting 10 E2E Web Search tests..."

for i in "${!QUERIES[@]}"; do
  QUERY="${QUERIES[$i]}"
  echo "Test $((i+1))/10: $QUERY"
  
  # Run the search and save to JSON
  pnpm web-search "$QUERY" > "$LOG_DIR/test_$((i+1)).json" 2> "$LOG_DIR/test_$((i+1)).err"
  
  if [ $? -eq 0 ]; then
    RESPONSE=$(jq -r '.response' "$LOG_DIR/test_$((i+1)).json")
    echo "✅ Success. Summary length: ${#RESPONSE} chars."
  else
    echo "❌ Failed."
  fi
done

echo "All tests completed. Results are in $LOG_DIR"
