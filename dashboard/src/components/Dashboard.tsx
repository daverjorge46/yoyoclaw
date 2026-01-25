import React, { useEffect, useState } from 'react';
import { fetchClawdbotLogs, fetchPokeMemories, fetchAgentZeroActivity } from '../services/api';
import { Activity, Terminal, Brain, GitBranch, Cpu, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const l = await fetchClawdbotLogs();
      const m = await fetchPokeMemories();
      const a = await fetchAgentZeroActivity();
      setLogs(l || []);
      setMemories(m?.recent_memories || []);
      setActivity(a?.terminal_history || []);
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const data = [
    { name: '10:00', load: 20 },
    { name: '10:05', load: 35 },
    { name: '10:10', load: 50 },
    { name: '10:15', load: 45 },
    { name: '10:20', load: 80 },
    { name: '10:25', load: 60 },
  ];

  return (
    <div className="flex-1 p-8 bg-slate-950 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">System Status</h1>
          <p className="text-slate-400">Unified Observability Mesh</p>
        </div>
        <div className="flex gap-4">
           <StatusBadge label="Clawdbot" status="online" color="bg-blue-500" />
           <StatusBadge label="OpenPoke" status="active" color="bg-purple-500" />
           <StatusBadge label="Agent Zero" status="idle" color="bg-emerald-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Token Usage</h3>
            <Cpu size={18} className="text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">24.5k</div>
          <p className="text-xs text-green-400 mt-2">+12% from last hour</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Active Agents</h3>
            <Activity size={18} className="text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">3</div>
          <p className="text-xs text-slate-500 mt-2">Running on local-docker-mesh</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium">Uptime</h3>
            <Clock size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">99.9%</div>
          <p className="text-xs text-slate-500 mt-2">System healthy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-80">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col">
          <h3 className="text-white font-medium mb-4">Agent Throughput</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
           <h3 className="text-white font-medium mb-4 flex items-center gap-2">
             <Brain size={18} className="text-purple-400" /> OpenPoke Memory Stream
           </h3>
           <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {memories.map((mem, i) => (
                <div key={i} className="flex gap-3 text-sm p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                   <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></div>
                   <div>
                     <p className="text-slate-200"><span className="text-purple-400 font-medium">Remembered:</span> {mem.entity}</p>
                     <p className="text-xs text-slate-500 mt-1">Context Score: {(mem.context_score * 100).toFixed(0)}%</p>
                   </div>
                </div>
              ))}
              {memories.length === 0 && <div className="text-slate-600 text-center py-4">Waiting for memory stream...</div>}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col h-96">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
             <Terminal size={18} className="text-blue-400" /> Clawdbot Execution Trace
           </h3>
            <div className="space-y-2 font-mono text-xs overflow-y-auto flex-1 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-500">{log.timestamp.split('T')[1].split('.')[0]}</span>
                  <span className={`${log.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'}`}>[{log.level}]</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
               {logs.length === 0 && <div className="text-slate-600 text-center py-4">Connecting to Clawdbot runtime...</div>}
            </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col h-96">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
             <GitBranch size={18} className="text-emerald-400" /> Agent Zero Activity
           </h3>
            <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {activity.map((act, i) => (
                <div key={i} className="border-l-2 border-emerald-500/30 pl-4 py-1">
                   <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{act.timestamp.split('T')[1].split('.')[0]}</span>
                      <span>{act.container_id}</span>
                   </div>
                   <div className="font-mono text-sm text-emerald-300 mb-1">$ {act.command}</div>
                   <div className="text-xs text-slate-400">{act.output}</div>
                </div>
              ))}
               {activity.length === 0 && <div className="text-slate-600 text-center py-4">Waiting for agent activity...</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ label, status, color }: { label: string, status: string, color: string }) => (
  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
    <div className={`w-2 h-2 rounded-full ${color} animate-pulse`}></div>
    <span className="text-xs font-medium text-slate-300">{label}</span>
  </div>
);

export default Dashboard;
