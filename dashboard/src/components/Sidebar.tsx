import React from 'react';
import { LayoutDashboard, Terminal, Brain, Activity, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">C</div>
        <span className="font-bold text-xl tracking-tight text-white">ClawdHub</span>
      </div>

      <nav className="space-y-1">
        <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
        <NavItem icon={<Terminal size={20} />} label="Clawdbot Logs" />
        <NavItem icon={<Brain size={20} />} label="OpenPoke Memory" />
        <NavItem icon={<Activity size={20} />} label="Agent Zero" />
      </nav>

      <div className="mt-auto">
        <NavItem icon={<Settings size={20} />} label="Settings" />
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default Sidebar;
