import React from 'react';
import { LayoutDashboard, Users, Layers, BarChart3, Key, LogOut, Settings } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, onLogout }) {
  const navItems = [
    { id: 'ADMIN_DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'RANKINGS', label: 'Leaderboard', icon: BarChart3 },
    { id: 'USER_DETAILS', label: 'User Details', icon: Users },
    { id: 'TEAMS_MANAGEMENT', label: 'Team Details', icon: Layers },
    { id: 'CREDENTIALS', label: 'Credentials', icon: Key },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/60 bg-[#0B1120] flex flex-col">
      <div className="p-4 border-b border-slate-800/60">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          EduInspire<span className="text-indigo-500">’26</span>
        </h2>
        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-wider">
          ADMIN
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800/60 space-y-1">
        <button
          onClick={() => setCurrentView('SETTINGS')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            currentView === 'SETTINGS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className={`w-4 h-4 ${currentView === 'SETTINGS' ? 'text-indigo-200' : 'text-slate-500'}`} />
          Settings
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 text-rose-500/70" />
          Logout
        </button>
      </div>
    </aside>
  );
}
