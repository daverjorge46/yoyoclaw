/* ===========================================
   LIAM'S DASHBOARD - CLIENT JAVASCRIPT
   Real-time updates, ECharts, keyboard shortcuts
   =========================================== */

// === CONFIGURATION ===
const REFRESH_INTERVAL = 5000; // 5 seconds
const CHART_HISTORY = 60; // 60 data points

// === STATE ===
let currentFilter = 'all';
let cpuChart = null;
let memChart = null;
let energyChart = null;

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchData();
    fetchChartData();
    fetchSkillData();
    setupFilterButtons();
    setupKeyboardShortcuts();
    setupCaptureInput();

    // Auto-refresh
    setInterval(fetchData, REFRESH_INTERVAL);
    setInterval(fetchChartData, REFRESH_INTERVAL);
    setInterval(fetchSkillData, REFRESH_INTERVAL);
});

// === DATA FETCHING ===
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        updateDashboard(data);
    } catch (err) {
        console.error('Failed to fetch data:', err);
    }
}

async function fetchChartData() {
    try {
        const res = await fetch(`/api/metrics/recent?limit=${CHART_HISTORY}`);
        const data = await res.json();
        updateCharts(data);
    } catch (err) {
        console.error('Failed to fetch chart data:', err);
    }
}

// === SKILL DATA FETCHING ===
async function fetchSkillData() {
    try {
        // EF Coach and Natural Capture data
        const [suggestion, focus, habits, recent, counts] = await Promise.all([
            fetch('/api/ef-coach/suggestions').then(r => r.json()),
            fetch('/api/ef-coach/focus').then(r => r.json()),
            fetch('/api/ef-coach/habits').then(r => r.json()),
            fetch('/api/natural-capture/recent').then(r => r.json()),
            fetch('/api/natural-capture/counts').then(r => r.json())
        ]);

        // Update EF Coach section
        updateEfCoachSection(suggestion, focus, habits);

        // Update Natural Capture section
        updateNaturalCaptureSection(recent, counts);
    } catch (err) {
        console.error('Failed to fetch skill data:', err);
    }
}

// === EF COACH UPDATES ===
function updateEfCoachSection(suggestion, focus, habits) {
    // Context suggestion
    document.getElementById('ef-suggestion').textContent = suggestion.suggestion || 'No suggestion';
    document.getElementById('ef-context-type').textContent = suggestion.context_type || '--';
    document.getElementById('ef-confidence').textContent = suggestion.confidence ? `${(suggestion.confidence * 100).toFixed(0)}%` : '--';

    // Focus session
    const focusCard = document.getElementById('ef-focus-card');
    const focusStatus = document.getElementById('ef-focus-status');
    const focusTimer = document.getElementById('ef-focus-timer');

    if (focus.active) {
        focusStatus.textContent = focus.task_name || 'Focus session';
        focusTimer.textContent = formatTimer(focus.elapsed_minutes);
        focusCard.style.borderColor = 'var(--success)';
    } else {
        focusStatus.textContent = 'No active session';
        focusTimer.textContent = '';
        focusCard.style.borderColor = 'var(--border)';
    }

    // Habits
    const habitsList = document.getElementById('ef-habits-list');
    if (habits.length === 0) {
        habitsList.innerHTML = '<div class="empty">No habits tracked</div>';
    } else {
        habitsList.innerHTML = habits.map(h => `
            <div class="capture-item">
                <div class="capture-item-title">
                    ${escapeHtml(h.name)}
                    ${h.streak_count > 0 ? `<span class="badge" style="margin-left:0.5rem">🔥 ${h.streak_count}</span>` : ''}
                </div>
                <div class="capture-item-meta">${h.goal_frequency} • ${h.last_completed || 'Never'}</div>
            </div>
        `).join('');
    }
}

// === NATURAL CAPTURE UPDATES ===
function updateNaturalCaptureSection(recent, counts) {
    // Recent captures
    const recentList = document.getElementById('captures-list-content');
    if (!recent || !Array.isArray(recent) || recent.length === 0) {
        recentList.innerHTML = '<div class="empty">No recent captures</div>';
    } else {
        recentList.innerHTML = recent.map(c => `
            <div class="capture-item">
                <div class="capture-item-title">${escapeHtml(c.title)}</div>
                <div class="capture-item-meta">
                    <span class="badge ${c.category}">${c.category}</span>
                    ${c.created_at ? new Date(c.created_at).toLocaleTimeString() : ''}
                </div>
            </div>
        `).join('');
    }

    // Type counts
    const countsEl = document.getElementById('capture-type-counts');
    if (counts) {
        countsEl.innerHTML = `
            <div class="type-count">
                <span class="type-count-label">Ideas</span>
                <span class="type-count-value">${counts.ideas || 0}</span>
            </div>
            <div class="type-count">
                <span class="type-count-label">Todos</span>
                <span class="type-count-value">${counts.todos || 0}</span>
            </div>
            <div class="type-count">
                <span class="type-count-label">Notes</span>
                <span class="type-count-value">${counts.notes || 0}</span>
            </div>
            <div class="type-count" style="border:none; margin-top:0.5rem">
                <span class="type-count-label">Total today</span>
                <span class="type-count-value">${counts.total || 0}</span>
            </div>
        `;
    }
}

// === CAPTURE INPUT ===
function setupCaptureInput() {
    const input = document.getElementById('capture-input');
    const submit = document.getElementById('capture-submit');

    submit.addEventListener('click', () => submitCapture());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitCapture();
        }
    });
}

async function submitCapture() {
    const input = document.getElementById('capture-input');
    const text = input.value.trim();

    if (!text) return;

    const submit = document.getElementById('capture-submit');
    submit.textContent = '...';
    submit.disabled = true;

    try {
        const res = await fetch('/api/natural-capture/capture', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, source: 'dashboard'})
        });
        const result = await res.json();

        if (result.success) {
            input.value = '';
            fetchSkillData(); // Refresh captures
        } else {
            alert(`Failed to capture: ${result.error}`);
        }
    } catch (err) {
        alert(`Error: ${err.message}`);
    } finally {
        submit.textContent = 'CAPTURE';
        submit.disabled = false;
    }
}

// === TIMER FORMATTING ===
function formatTimer(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.floor((minutes * 60) % 60);
    if (h > 0) {
        return `${h}h ${m}m`;
    } else if (m > 0) {
        return `${m}m ${s}s`;
    } else {
        return `${s}s`;
    }
}

// === DASHBOARD UPDATE ===
function updateDashboard(data) {
    // Timestamp
    const ts = new Date(data.timestamp);
    document.getElementById('timestamp').textContent = ts.toLocaleTimeString();

    // Gateway status
    const statusEl = document.getElementById('gateway-status');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');
    dot.className = `status-dot ${data.gateway.status}`;
    text.textContent = data.gateway.status.toUpperCase();

    // Metrics
    updateMetric('cpu', data.resources.cpu_percent);
    updateMetric('mem', data.resources.mem_percent);
    updateMetric('disk', data.resources.disk_percent);
    document.getElementById('sessions-value').textContent = data.sessions.length;

    // Sessions table
    updateSessionsTable(data.sessions);

    // Subagents tree
    updateSubagentsTree(data.subagents);

    // Queue table
    updateQueueTable(data.queue);
}

function updateMetric(name, value) {
    const valueEl = document.getElementById(`${name}-value`);
    const barEl = document.getElementById(`${name}-bar`);

    valueEl.textContent = `${value}%`;
    barEl.style.width = `${value}%`;

    // Color coding
    barEl.className = 'metric-fill';
    if (value >= 80) barEl.classList.add('high');
    else if (value >= 50) barEl.classList.add('medium');
    else barEl.classList.add('low');
}

// === SESSIONS TABLE ===
function updateSessionsTable(sessions) {
    const tbody = document.querySelector('#sessions-table tbody');

    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty">No active sessions</td></tr>';
        return;
    }

    tbody.innerHTML = sessions.map(s => `
        <tr>
            <td>${escapeHtml(s.agent)}</td>
            <td>${escapeHtml(s.channel)}</td>
            <td>${escapeHtml(s.updated)}</td>
        </tr>
    `).join('');
}

// === SUBAGENTS TREE ===
function updateSubagentsTree(subagents) {
    const container = document.getElementById('subagents-tree');

    if (subagents.length === 0) {
        container.innerHTML = '<div class="empty">No active subagents</div>';
        return;
    }

    // Build ASCII tree
    const lines = subagents.map((s, i) => {
        const prefix = i === subagents.length - 1 ? '└─' : '├─';
        const statusClass = s.status;
        return `<div class="tree-item ${statusClass}">${prefix} ${escapeHtml(s.label || s.task)} [${s.status}]</div>`;
    });

    container.innerHTML = lines.join('');
}

// === QUEUE TABLE ===
function updateQueueTable(queue) {
    const tbody = document.querySelector('#queue-table tbody');

    // Filter
    const filtered = currentFilter === 'all'
        ? queue
        : queue.filter(q => q.status === currentFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty">No items</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(q => `
        <tr>
            <td>${escapeHtml(q.id)}</td>
            <td>${escapeHtml(q.title)}</td>
            <td><span class="status-pill ${q.status}">${q.status.toUpperCase()}</span></td>
        </tr>
    `).join('');
}

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            fetchData(); // Refresh to apply filter
        });
    });
}

// === ECHARTS ===
function initCharts() {
    // CPU Chart
    const cpuDom = document.getElementById('cpu-chart');
    cpuChart = echarts.init(cpuDom);
    cpuChart.setOption(getChartOption('CPU USAGE', '#ff4444'));

    // Memory Chart
    const memDom = document.getElementById('mem-chart');
    memChart = echarts.init(memDom);
    memChart.setOption(getChartOption('MEMORY USAGE', '#0088ff'));

    // Energy Chart (EF Coach)
    const energyDom = document.getElementById('energy-chart');
    if (energyDom) {
        energyChart = echarts.init(energyDom);
        energyChart.setOption(getEnergyChartOption());
    }

    // Resize handler
    window.addEventListener('resize', () => {
        cpuChart.resize();
        memChart.resize();
        if (energyChart) energyChart.resize();
    });
}

function getChartOption(title, color) {
    return {
        backgroundColor: 'transparent',
        title: {
            text: title,
            textStyle: { color: '#888888', fontSize: 12, fontWeight: 'normal' },
            left: 0,
            top: 0
        },
        grid: { left: 40, right: 10, top: 30, bottom: 25 },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#2a2a2a' } },
            axisLabel: { color: '#666666', fontSize: 10 },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            axisLine: { lineStyle: { color: '#2a2a2a' } },
            axisLabel: { color: '#666666', fontSize: 10, formatter: '{value}%' },
            splitLine: { lineStyle: { color: '#1a1a1a' } }
        },
        series: [{
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: { color: color, width: 2 },
            areaStyle: { color: color + '20' },
            data: []
        }]
    };
}

function getEnergyChartOption() {
    return {
        backgroundColor: 'transparent',
        grid: { left: 30, right: 10, top: 10, bottom: 20 },
        xAxis: {
            type: 'category',
            data: [],
            axisLine: { lineStyle: { color: '#2a2a2a' } },
            axisLabel: { show: false },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            min: 1,
            max: 10,
            axisLine: { show: false },
            axisLabel: { show: false },
            splitLine: { lineStyle: { color: '#1a1a1a' } }
        },
        series: [{
            type: 'bar',
            data: [],
            itemStyle: { color: '#ffaa00' },
            barWidth: '60%'
        }]
    };
}

function updateCharts(data) {
    if (data.length === 0) return;

    const cpuData = data.map(d => [new Date(d.timestamp), d.cpu_percent]);
    const memData = data.map(d => [new Date(d.timestamp), d.mem_percent]);

    cpuChart.setOption({ series: [{ data: cpuData }] });
    memChart.setOption({ series: [{ data: memData }] });
}

// === KEYBOARD SHORTCUTS ===
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.key.toLowerCase()) {
            case 'r':
                fetchData();
                fetchChartData();
                break;
            case '?':
                showShortcuts();
                break;
            case 'escape':
                closeShortcuts();
                break;
        }
    });
}

function showShortcuts() {
    document.getElementById('shortcuts-modal').style.display = 'flex';
}

function closeShortcuts() {
    document.getElementById('shortcuts-modal').style.display = 'none';
}

// === UTILITIES ===
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
