#!/usr/bin/env python3
"""
Liam's Project Dashboard
Visual dashboard for tracking active projects and tasks
"""

import json
import os
from datetime import datetime
from flask import Flask, jsonify, render_template
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path('/home/liam/clawd')
DATA_DIR = BASE_DIR / 'dashboard' / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)


def parse_evolution_queue():
    """Parse EVOLUTION-QUEUE.md into structured data"""
    queue_path = BASE_DIR / 'EVOLUTION-QUEUE.md'
    
    if not queue_path.exists():
        return {'error': 'EVOLUTION-QUEUE.md not found'}
    
    with open(queue_path, 'r') as f:
        content = f.read()
    
    projects = []
    current_section = None
    
    for line in content.split('\n'):
        line = line.strip()
        
        # Detect sections
        if line.startswith('## ') and 'Pending' in line:
            current_section = 'pending'
        elif line.startswith('## ') and 'Paused' in line:
            current_section = 'paused'
        elif line.startswith('## ') and 'Approved' in line:
            current_section = 'approved'
        elif current_section and line.startswith('### '):
            # Parse project entry
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
        
        # Extract basic info
        task_name = task_file.stem
        lines = content.split('\n')
        
        # Parse status from file
        status = 'active'
        progress = 0
        total = 100
        
        for line in lines:
            if line.startswith('STATUS:'):
                status = line.split(':', 1)[1].strip()
            elif line.startswith('Progress:'):
                match = line.split('[')[1].split(']')[0] if '[' in line else '0'
                if '/' in match:
                    progress_str, total_str = match.split('/')
                    progress = int(progress_str) if progress_str.isdigit() else 0
                    total = int(total_str) if total_str.isdigit() else 100
        
        tasks.append({
            'name': task_name,
            'status': status,
            'progress': progress,
            'total': total,
            'percent': int((progress / total) * 100) if total > 0 else 0,
            'updated': datetime.fromtimestamp(task_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
        })
    
    return sorted(tasks, key=lambda x: x['updated'], reverse=True)


@app.route('/')
def index():
    """Render dashboard"""
    projects = parse_evolution_queue()
    tasks = parse_progress_files()
    
    return render_template('dashboard.html',
                     projects=projects,
                     tasks=tasks,
                     timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


@app.route('/api/projects')
def api_projects():
    """API endpoint for projects data"""
    return jsonify(parse_evolution_queue())


@app.route('/api/tasks')
def api_tasks():
    """API endpoint for tasks data"""
    return jsonify(parse_progress_files())


if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"Starting Liam's Dashboard at http://localhost:8080")
    print(f"{'='*60}\n")
    app.run(host='127.0.0.1', port=8080, debug=False)
