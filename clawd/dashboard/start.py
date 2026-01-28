#!/usr/bin/env python3
"""
Enhanced Dashboard Generator for Liam
Home base for system monitoring, projects, and tasks
"""

import json
import os
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
from pathlib import Path

BASE_DIR = Path('/home/liam/clawd')
OUTPUT_FILE = BASE_DIR / 'dashboard' / 'index.html'
PORT = 8080


def get_gateway_status():
    """Check Clawdbot gateway status"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', 'clawdbot-gateway'],
            capture_output=True,
            text=True,
            timeout=2
        )
        status = result.stdout.strip()
        if status == 'active':
            return {'status': 'running', 'color': '#6bcb77', 'text': 'Running'}
        elif status == 'inactive':
            return {'status': 'stopped', 'color': '#ff6b6b', 'text': 'Stopped'}
        else:
            return {'status': status, 'color': '#ffd93d', 'text': status}
    except:
        return {'status': 'unknown', 'color': '#8888aa', 'text': 'Unknown'}


def get_system_resources():
    """Get system resource usage"""
    try:
        # CPU usage (from /proc/stat)
        with open('/proc/stat', 'r') as f:
            lines = f.readlines()
        
        cpu_total = 0
        cpu_idle = 0
        for line in lines:
            if line.startswith('cpu '):
                parts = line.split()
                cpu_total = sum(int(x) for x in parts[1:5])
                cpu_idle = int(parts[4])
                cpu_percent = ((cpu_total - cpu_idle) / cpu_total) * 100
                break
        
        # Memory usage (from /proc/meminfo)
        with open('/proc/meminfo', 'r') as f:
            meminfo = dict(line.split(':') for line in f.read().split('\n') if ':' in line)
        
        mem_total = int(meminfo.get('MemTotal', '0').strip().split()[0])
        mem_available = int(meminfo.get('MemAvailable', '0').strip().split()[0])
        mem_percent = ((mem_total - mem_available) / mem_total) * 100
        
        # Disk usage
        disk_result = subprocess.run(
            ['df', '-h', '/home'],
            capture_output=True,
            text=True,
            timeout=2
        )
        disk_lines = disk_result.stdout.split('\n')
        disk_info = disk_lines[1].split() if len(disk_lines) > 1 else {}
        disk_percent = int(disk_info[4].replace('%', '')) if len(disk_info) > 4 else 0
        
        return {
            'cpu_percent': round(cpu_percent, 1),
            'mem_percent': round(mem_percent, 1),
            'mem_total_gb': round(mem_total / 1024 / 1024, 1),
            'disk_percent': disk_percent,
            'disk_total': disk_info[1] if len(disk_info) > 1 else 'N/A'
        }
    except Exception as e:
        return {
            'cpu_percent': 0,
            'mem_percent': 0,
            'mem_total_gb': 0,
            'disk_percent': 0,
            'disk_total': 'N/A'
        }


def get_active_sessions():
    """Get number of active Clawdbot sessions"""
    try:
        sessions_dir = Path('/home/liam/.clawdbot/agents')
        if not sessions_dir.exists():
            return 0
        
        active_count = 0
        for agent_dir in sessions_dir.iterdir():
            sessions_file = agent_dir / 'sessions' / 'sessions.json'
            if sessions_file.exists():
                try:
                    with open(sessions_file, 'r') as f:
                        data = json.load(f)
                        for session_key, session_info in data.items():
                            if session_info.get('lastChannel') or session_info.get('updatedAt'):
                                active_count += 1
                except:
                    pass
        
        return active_count
    except:
        return 0


def parse_evolution_queue():
    """Parse EVOLUTION-QUEUE.md into structured data"""
    queue_path = BASE_DIR / 'EVOLUTION-QUEUE.md'
    
    if not queue_path.exists():
        return []
    
    with open(queue_path, 'r') as f:
        content = f.read()
    
    projects = []
    current_section = None
    
    for line in content.split('\n'):
        line = line.strip()
        
        if line.startswith('## ') and 'Pending' in line:
            current_section = 'pending'
        elif line.startswith('## ') and 'Paused' in line:
            current_section = 'paused'
        elif line.startswith('## ') and 'Approved' in line:
            current_section = 'approved'
        elif current_section and line.startswith('### '):
            entry_id = line.strip('#').strip()
            title = entry_id.split('] ')[-1] if '] ' in entry_id else entry_id
            
            projects.append({
                'id': entry_id,
                'title': title,
                'status': current_section,
                'section': current_section
            })
    
    return projects


def parse_progress_files():
    """Parse progress files from progress/ directory"""
    progress_dir = BASE_DIR / 'progress'
    
    if not progress_dir.exists():
        return []
    
    tasks = []
    
    for task_file in progress_dir.glob('*.txt'):
        with open(task_file, 'r') as f:
            content = f.read()
        
        task_name = task_file.stem
        lines = content.split('\n')
        
        status = 'active'
        progress = 0
        total = 100
        
        for line in lines:
            if 'STATUS:' in line:
                status = line.split(':', 1)[1].strip()
            elif 'Progress: [' in line:
                try:
                    match = line.split('[')[1].split(']')[0] if '[' in line else '0'
                    if '/' in match:
                        progress_str, total_str = match.split('/')
                        progress = int(progress_str) if progress_str.isdigit() else 0
                        total = int(total_str) if total_str.isdigit() else 100
                except:
                    pass
        
        updated = datetime.fromtimestamp(task_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
        
        tasks.append({
            'name': task_name,
            'status': status,
            'progress': progress,
            'total': total,
            'percent': int((progress / total) * 100) if total > 0 else 0,
            'updated': updated
        })
    
    return sorted(tasks, key=lambda x: x['updated'], reverse=True)


def generate_html(gateway_status, resources, active_sessions, projects, tasks):
    """Generate comprehensive dashboard HTML"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    pending_count = sum(1 for p in projects if p['section'] == 'pending')
    active_count = sum(1 for t in tasks if t['status'] == 'active')
    
    # System status color
    sys_status_color = '#6bcb77' if gateway_status['status'] == 'running' else '#ff6b6b'
    
    project_cards = []
    for p in projects:
        card = f'''
        <div class="card">
            <div class="card-header">
                <span class="card-id">{p['id']}</span>
                <span class="card-status status-{p['section']}">{p['section']}</span>
            </div>
            <div class="card-title">{p['title']}</div>
            <div class="card-meta">Status: {p['status']}</div>
        </div>'''
        project_cards.append(card)
    
    task_cards = []
    for t in tasks:
        card = f'''
        <div class="card">
            <div class="card-header">
                <span class="card-status status-{t['status']}">{t['status']}</span>
            </div>
            <div class="card-title">{t['name']}</div>
            <div class="card-meta">Updated: {t['updated']}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {t['percent']}%"></div>
            </div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #8888aa;">
                {t['progress']} / {t['total']} steps ({t['percent']}%)
            </div>
        </div>'''
        task_cards.append(card)
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liam's Home Base</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{ max-width: 1600px; margin: 0 auto; }}
        header {{ text-align: center; padding: 30px 0; border-bottom: 1px solid #2a2a4a; margin-bottom: 30px; }}
        h1 {{ 
            font-size: 2.5em; font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }}
        .subtitle {{ color: #8888aa; font-size: 0.9em; margin-top: 10px; }}
        .refresh-info {{ color: #666688; font-size: 0.8em; margin-top: 5px; }}
        
        .main-grid {{ display: grid; grid-template-columns: 1fr 2fr; gap: 30px; margin-bottom: 40px; }}
        
        .sidebar {{ display: flex; flex-direction: column; gap: 20px; }}
        
        .status-section {{ background: rgba(255, 255, 255, 0.05); border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; }}
        .section-title {{ font-size: 1.4em; font-weight: 600; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; display: flex; align-items: center; gap: 10px; }}
        
        .system-status {{ display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }}
        .status-dot {{ width: 12px; height: 12px; border-radius: 50%; }}
        .status-dot.running {{ background: #6bcb77; box-shadow: 0 0 10px #6bcb77; }}
        .status-dot.stopped {{ background: #ff6b6b; }}
        .status-dot.unknown {{ background: #ffd93d; }}
        
        .resource-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px; }}
        .resource-item {{ background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 15px; text-align: center; }}
        .resource-value {{ font-size: 2em; font-weight: 700; color: #667eea; }}
        .resource-label {{ color: #8888aa; font-size: 0.85em; margin-top: 5px; }}
        .resource-bar {{ height: 6px; background: rgba(0, 0, 0, 0.3); border-radius: 3px; margin-top: 10px; overflow: hidden; }}
        .resource-fill {{ height: 100%; transition: width 0.5s ease; border-radius: 3px; }}
        .resource-fill.cpu {{ background: #ff6b6b; }}
        .resource-fill.mem {{ background: #667eea; }}
        .resource-fill.disk {{ background: #6bcb77; }}
        
        .content-area {{ display: flex; flex-direction: column; gap: 20px; }}
        
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }}
        .stat-card {{ background: rgba(255, 255, 255, 0.05); border: 1px solid #2a2a4a; border-radius: 8px; padding: 15px; text-align: center; }}
        .stat-value {{ font-size: 1.8em; font-weight: 700; color: #667eea; }}
        .stat-label {{ color: #8888aa; font-size: 0.85em; margin-top: 5px; }}
        
        .badge {{ padding: 4px 10px; border-radius: 15px; font-size: 0.75em; font-weight: 600; }}
        .badge-pending {{ background: #ff6b6b; color: white; }}
        .badge-paused {{ background: #ffd93d; color: #1a1a2e; }}
        .badge-active {{ background: #6bcb77; color: white; }}
        
        .section {{ margin-bottom: 20px; }}
        .section {{ margin-bottom: 40px; }}
        .section-title {{ font-size: 1.5em; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }}
        
        .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; }}
        .card {{
            background: rgba(255, 255, 255, 0.05); border: 1px solid #2a2a4a;
            border-radius: 12px; padding: 20px; transition: all 0.3s ease; cursor: pointer;
        }}
        .card:hover {{ transform: translateY(-5px); border-color: #667eea; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2); }}
        .card-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }}
        .card-id {{ font-family: 'Monaco', 'Consolas', monospace; font-size: 0.7em; color: #666688; background: rgba(0, 0, 0, 0.2); padding: 3px 6px; border-radius: 4px; }}
        .card-status {{ padding: 4px 10px; border-radius: 12px; font-size: 0.7em; font-weight: 600; text-transform: uppercase; }}
        .status-pending {{ background: #ff6b6b33; color: #ff6b6b; }}
        .status-paused {{ background: #ffd93d33; color: #ffd93d; }}
        .status-active {{ background: #6bcb7733; color: #6bcb77; }}
        .card-title {{ font-size: 1.1em; font-weight: 600; margin-bottom: 10px; color: #ffffff; }}
        .card-meta {{ color: #8888aa; font-size: 0.8em; margin-bottom: 15px; }}
        .progress-bar {{ width: 100%; height: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; overflow: hidden; margin-top: 10px; }}
        .progress-fill {{ height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.5s ease; border-radius: 4px; }}
        
        footer {{ text-align: center; padding: 30px 0; color: #666688; font-size: 0.8em; border-top: 1px solid #2a2a4a; margin-top: 40px; }}
        .empty-state {{ text-align: center; padding: 30px; color: #666688; font-style: italic; }}
        
        @media (max-width: 1200px) {{
            .main-grid {{ grid-template-columns: 1fr; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🏠 Liam's Home Base</h1>
            <p class="subtitle">System Status • Projects • Tasks</p>
            <p class="refresh-info">Last updated: {timestamp} • Auto-refresh: 30s</p>
        </header>

        <div class="main-grid">
            <div class="sidebar">
                <div class="status-section">
                    <div class="section-title">
                        System Health
                        <div class="system-status">
                            <div class="status-dot {gateway_status['status']}"></div>
                            <span style="color: {gateway_status['color']}; font-weight: 600;">{gateway_status['text']}</span>
                        </div>
                    </div>
                    
                    <div class="resource-grid">
                        <div class="resource-item">
                            <div class="resource-value">{resources['cpu_percent']}%</div>
                            <div class="resource-label">CPU</div>
                            <div class="resource-bar">
                                <div class="resource-fill cpu" style="width: {resources['cpu_percent']}%"></div>
                            </div>
                        </div>
                        <div class="resource-item">
                            <div class="resource-value">{resources['mem_percent']}%</div>
                            <div class="resource-label">RAM ({resources['mem_total_gb']} GB)</div>
                            <div class="resource-bar">
                                <div class="resource-fill mem" style="width: {resources['mem_percent']}%"></div>
                            </div>
                        </div>
                        <div class="resource-item">
                            <div class="resource-value">{resources['disk_percent']}%</div>
                            <div class="resource-label">Disk ({resources['disk_total']})</div>
                            <div class="resource-bar">
                                <div class="resource-fill disk" style="width: {resources['disk_percent']}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">{active_sessions}</div>
                            <div class="stat-label">Active Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{len(projects)}</div>
                            <div class="stat-label">Queue Items</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">{len(tasks)}</div>
                            <div class="stat-label">Active Tasks</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="content-area">
                <div class="section">
                    <div class="section-title">
                        Evolution Queue
                        <span class="badge badge-pending">{pending_count} Pending</span>
                    </div>
                    <div class="grid">
                        {''.join(project_cards) if project_cards else '<div class="empty-state">No pending items</div>'}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">
                        Active Tasks
                        <span class="badge badge-active">{active_count} Active</span>
                    </div>
                    <div class="grid">
                        {''.join(task_cards) if task_cards else '<div class="empty-state">No active tasks</div>'}
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <p>Liam's Home Base © 2026</p>
            <p>System Monitoring • Project Tracking • Task Management</p>
        </footer>
    </div>

    <script>
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>'''
    
    return html


def regenerate_html():
    """Regenerate HTML and save to file"""
    gateway_status = get_gateway_status()
    resources = get_system_resources()
    active_sessions = get_active_sessions()
    projects = parse_evolution_queue()
    tasks = parse_progress_files()
    html = generate_html(gateway_status, resources, active_sessions, projects, tasks)
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write(html)
    
    print(f"Generated: gateway={gateway_status['status']}, cpu={resources['cpu_percent']}%, mem={resources['mem_percent']}%, sessions={active_sessions}")


def start_server():
    """Start HTTP server serving dashboard"""
    os.chdir(OUTPUT_FILE.parent)
    
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
        
        def do_GET(self):
            if self.path == '/' or self.path == '/index.html':
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                
                regenerate_html()
                
                with open(OUTPUT_FILE, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)
    
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"\\n{'='*60}")
    print(f"Liam's Home Base: http://localhost:{PORT}")
    print(f"{'='*60}\\n")
    server.serve_forever()


if __name__ == '__main__':
    regenerate_html()
    start_server()
