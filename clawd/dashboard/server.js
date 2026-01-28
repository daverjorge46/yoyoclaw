#!/usr/bin/env node
/**
 * Liam's Project Dashboard
 * Simple Node.js server to serve dashboard
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 8080;
const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parse EVOLUTION-QUEUE.md into structured data
 */
function parseEvolutionQueue() {
    const queuePath = path.join(BASE_DIR, 'EVOLUTION-QUEUE.md');
    
    if (!fs.existsSync(queuePath)) {
        return { error: 'EVOLUTION-QUEUE.md not found' };
    }
    
    const content = fs.readFileSync(queuePath, 'utf8');
    const projects = [];
    let currentSection = null;
    
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Detect sections
        if (trimmed.startsWith('## ') && trimmed.includes('Pending')) {
            currentSection = 'pending';
        } else if (trimmed.startsWith('## ') && trimmed.includes('Paused')) {
            currentSection = 'paused';
        } else if (trimmed.startsWith('## ') && trimmed.includes('Approved')) {
            currentSection = 'approved';
        } else if (currentSection && trimmed.startsWith('### ')) {
            // Parse project entry
            const entryId = trimmed.replace(/^### /, '').trim();
            const title = entryId.includes('] ') 
                ? entryId.split('] ')[1] 
                : entryId;
            
            projects.push({
                id: entryId,
                title: title,
                status: currentSection,
                section: currentSection
            });
        }
    }
    
    return projects;
}

/**
 * Parse progress files from progress/ directory
 */
function parseProgressFiles() {
    const progressDir = path.join(BASE_DIR, 'progress');
    
    if (!fs.existsSync(progressDir)) {
        return [];
    }
    
    const tasks = [];
    const files = fs.readdirSync(progressDir).filter(f => f.endsWith('.txt'));
    
    for (const taskFile of files) {
        const taskPath = path.join(progressDir, taskFile);
        const content = fs.readFileSync(taskPath, 'utf8');
        
        const taskName = taskFile.replace('.txt', '');
        const lines = content.split('\n');
        
        let status = 'active';
        let progress = 0;
        let total = 100;
        
        for (const line of lines) {
            if (line.startsWith('STATUS:')) {
                status = line.split(':', 2)[1]?.trim() || 'active';
            } else if (line.includes('Progress: [')) {
                const match = line.match(/Progress: \[(\d+)\/(\d+)\]/);
                if (match) {
                    progress = parseInt(match[1]) || 0;
                    total = parseInt(match[2]) || 100;
                }
            }
        }
        
        const stats = fs.statSync(taskPath);
        const updated = new Date(stats.mtime).toISOString().slice(0, 16).replace('T', ' ');
        
        tasks.push({
            name: taskName,
            status: status,
            progress: progress,
            total: total,
            percent: total > 0 ? Math.round((progress / total) * 100) : 0,
            updated: updated
        });
    }
    
    return tasks.sort((a, b) => new Date(b.updated) - new Date(a.updated));
}

/**
 * Serve HTML dashboard
 */
function renderDashboard(projects, tasks) {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const pendingCount = projects.filter(p => p.section === 'pending').length;
    const activeCount = tasks.filter(t => t.status === 'active').length;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liam's Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        header { text-align: center; padding: 30px 0; border-bottom: 1px solid #2a2a4a; margin-bottom: 30px; }
        h1 { 
            font-size: 2.5em; font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .subtitle { color: #8888aa; font-size: 0.9em; margin-top: 10px; }
        .refresh-info { color: #666688; font-size: 0.8em; margin-top: 5px; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 1.8em; font-weight: 600; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; display: flex; align-items: center; gap: 10px; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; }
        .badge-pending { background: #ff6b6b; color: white; }
        .badge-paused { background: #ffd93d; color: #1a1a2e; }
        .badge-active { background: #6bcb77; color: white; }
        .badge-approved { background: #4ecdc4; color: white; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
        .card {
            background: rgba(255, 255, 255, 0.05); border: 1px solid #2a2a4a;
            border-radius: 12px; padding: 20px; transition: all 0.3s ease; cursor: pointer;
        }
        .card:hover { transform: translateY(-5px); border-color: #667eea; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2); }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
        .card-id { font-family: 'Monaco', 'Consolas', monospace; font-size: 0.75em; color: #666688; background: rgba(0, 0, 0, 0.2); padding: 4px 8px; border-radius: 4px; }
        .card-status { padding: 4px 10px; border-radius: 12px; font-size: 0.7em; font-weight: 600; text-transform: uppercase; }
        .status-pending { background: #ff6b6b33; color: #ff6b6b; }
        .status-paused { background: #ffd93d33; color: #ffd93d; }
        .status-active { background: #6bcb7733; color: #6bcb77; }
        .status-completed { background: #4ecdc433; color: #4ecdc4; }
        .card-title { font-size: 1.2em; font-weight: 600; margin-bottom: 10px; color: #ffffff; }
        .card-meta { color: #8888aa; font-size: 0.85em; margin-bottom: 15px; }
        .progress-bar { width: 100%; height: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.5s ease; border-radius: 4px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
        .stat-card { background: rgba(255, 255, 255, 0.05); border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; text-align: center; }
        .stat-value { font-size: 2.5em; font-weight: 700; color: #667eea; }
        .stat-label { color: #8888aa; font-size: 0.9em; margin-top: 5px; }
        footer { text-align: center; padding: 30px 0; color: #666688; font-size: 0.85em; border-top: 1px solid #2a2a4a; margin-top: 40px; }
        .empty-state { text-align: center; padding: 40px; color: #666688; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🦞 Liam's Dashboard</h1>
            <p class="subtitle">Project & Task Tracking</p>
            <p class="refresh-info">Last updated: ${timestamp}</p>
        </header>

        <div class="section">
            <div class="section-title">
                Overview
                <span class="badge badge-active">Live</span>
            </div>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${projects.length}</div>
                    <div class="stat-label">Total Projects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${tasks.length}</div>
                    <div class="stat-label">Active Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${pendingCount}</div>
                    <div class="stat-label">Pending Items</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${activeCount}</div>
                    <div class="stat-label">In Progress</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">
                Evolution Queue Projects
                <span class="badge badge-pending">${pendingCount} Pending</span>
            </div>
            ${projects.length > 0 ? `
            <div class="grid">
                ${projects.map(p => `
                <div class="card">
                    <div class="card-header">
                        <span class="card-id">${p.id}</span>
                        <span class="card-status status-${p.section}">${p.section}</span>
                    </div>
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">Status: ${p.status}</div>
                </div>
                `).join('')}
            </div>
            ` : '<div class="empty-state">No projects in Evolution Queue</div>'}
        </div>

        <div class="section">
            <div class="section-title">
                Active Tasks
                <span class="badge badge-active">${activeCount} Active</span>
            </div>
            ${tasks.length > 0 ? `
            <div class="grid">
                ${tasks.map(t => `
                <div class="card">
                    <div class="card-header">
                        <span class="card-status status-${t.status}">${t.status}</span>
                    </div>
                    <div class="card-title">${t.name}</div>
                    <div class="card-meta">Updated: ${t.updated}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${t.percent}%"></div>
                    </div>
                    <div style="margin-top: 10px; font-size: 0.9em; color: #8888aa;">
                        ${t.progress} / ${t.total} steps (${t.percent}%)
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<div class="empty-state">No active tasks in progress</div>'}
        </div>

        <footer>
            <p>Liam's Project Dashboard © 2026</p>
            <p>Auto-refresh every 30 seconds</p>
        </footer>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => { location.reload(); }, 30000);
    </script>
</body>
</html>`;
}

/**
 * Create HTTP server
 */
import http from 'http';

function createServer() {
    const server = http.createServer((req, res) => {
        const projects = parseEvolutionQueue();
        const tasks = parseProgressFiles();
        
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(renderDashboard(projects, tasks));
        } else if (req.url === '/api/projects') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(projects));
        } else if (req.url === '/api/tasks') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(tasks));
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    
    return server;
}

// Start server
const server = createServer();
server.listen(PORT, '127.0.0.1', () => {
    console.log('\\n' + '='.repeat(60));
    console.log(`Starting Liam's Dashboard at http://localhost:${PORT}`);
    console.log('='.repeat(60) + '\\n');
});
