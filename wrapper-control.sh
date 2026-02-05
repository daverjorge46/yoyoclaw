#!/bin/bash
#
# API Wrapper Control Script
#

WRAPPER_DIR="/Users/shantanu/Developer/GitHub/EAZYBE-AI/MCP /openclaw/api-wrapper"
PID_FILE="/tmp/api-wrapper.pid"
LOG_FILE="/tmp/api-wrapper.log"

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "API Wrapper is already running (PID: $(cat $PID_FILE))"
      exit 1
    fi

    echo "Starting API Wrapper..."
    cd "$WRAPPER_DIR"
    pnpm start > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ API Wrapper started successfully"
      echo "   PID: $(cat $PID_FILE)"
      echo "   URL: http://localhost:8000"
      echo "   Logs: $LOG_FILE"
    else
      echo "❌ Failed to start API Wrapper"
      cat "$LOG_FILE"
      exit 1
    fi
    ;;

  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "API Wrapper is not running"
      exit 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
      echo "Stopping API Wrapper (PID: $PID)..."
      kill $PID
      rm "$PID_FILE"
      echo "✅ API Wrapper stopped"
    else
      echo "API Wrapper process not found, cleaning up PID file"
      rm "$PID_FILE"
    fi
    ;;

  restart)
    $0 stop
    sleep 2
    $0 start
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ API Wrapper is running"
      echo "   PID: $(cat $PID_FILE)"
      echo "   URL: http://localhost:8000"
      echo ""
      echo "Test with:"
      echo "  curl -X POST http://localhost:8000/api/chat \\"
      echo "    -H 'Content-Type: application/json' \\"
      echo "    -d '{\"query\": \"Give me avg response time\", \"org_id\": \"902\"}'"
    else
      echo "❌ API Wrapper is not running"
      if [ -f "$PID_FILE" ]; then
        rm "$PID_FILE"
      fi
    fi
    ;;

  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "No log file found at $LOG_FILE"
    fi
    ;;

  test)
    echo "Running quick test..."
    response=$(curl -s -X POST http://localhost:8000/api/chat \
      -H "Content-Type: application/json" \
      -d '{"query": "ping", "org_id": "902"}')

    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
      echo "✅ Wrapper is responding"
      echo "$response" | jq .
    else
      echo "❌ Test failed"
      echo "$response"
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs|test}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the API wrapper"
    echo "  stop     - Stop the API wrapper"
    echo "  restart  - Restart the API wrapper"
    echo "  status   - Check if wrapper is running"
    echo "  logs     - Tail wrapper logs"
    echo "  test     - Send a test query"
    exit 1
    ;;
esac
