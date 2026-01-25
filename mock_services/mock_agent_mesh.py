import http.server
import socketserver
import json
import threading
import time
import random
from datetime import datetime

# --- Mock Data Generators ---

def generate_clawdbot_log():
    actions = ["executing_lobster_pipeline", "checking_cron_jobs", "reading_file_system", "updating_nixos_flake"]
    status = ["INFO", "WARN", "DEBUG"]
    return {
        "timestamp": datetime.now().isoformat(),
        "source": "clawdbot",
        "level": random.choice(status),
        "message": f"Clawdbot {random.choice(actions)}: processed {random.randint(1, 100)} items.",
        "agent_id": "krill-01"
    }

def generate_poke_memory():
    # Simulates a graph node retrieval
    entities = ["John Doe", "Project Alpha", "Meeting Q3", "Invoice #909"]
    return {
        "type": "memory_access",
        "entity": random.choice(entities),
        "context_score": random.uniform(0.7, 0.99),
        "timestamp": datetime.now().isoformat(),
        "source": "openpoke"
    }

def generate_agent_zero_activity():
    # Simulates autonomous terminal output
    commands = ["git pull origin main", "pip install pandas", "docker build .", "python data_analysis.py"]
    return {
        "timestamp": datetime.now().isoformat(),
        "source": "agent_zero",
        "command": random.choice(commands),
        "output": "Success: Operation completed in 0.4s",
        "container_id": "a0-container-x99"
    }

# --- Generic Handler ---

class MockHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        data = {}
        if self.server.service_name == "clawdbot":
            data = [generate_clawdbot_log() for _ in range(5)]
        elif self.server.service_name == "openpoke":
            data = {"recent_memories": [generate_poke_memory() for _ in range(3)]}
        elif self.server.service_name == "agent_zero":
            data = {"terminal_history": [generate_agent_zero_activity() for _ in range(4)]}
            
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        return # Silence console logs

# --- Server Spawning ---

def run_server(port, name):
    handler = MockHandler
    httpd = socketserver.TCPServer(("", port), handler)
    httpd.service_name = name
    print(f"[{name}] Mock Service running on port {port}")
    httpd.serve_forever()

if __name__ == "__main__":
    threads = []
    services = [
        (18789, "clawdbot"),
        (8000, "openpoke"),
        (8080, "agent_zero")
    ]

    print("--- Starting Mock AI Agent Mesh ---")
    for port, name in services:
        t = threading.Thread(target=run_server, args=(port, name))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down mock services...")
