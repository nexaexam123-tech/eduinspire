import React, { useState, useEffect } from 'react';
import { LogOut, Bell, ChevronDown } from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

export default function Header({ user, currentView, setCurrentView, eventState, onLogout }) {
  const isEvaluationOpen = eventState?.evaluation_status === 'OPEN';
  const isAdmin = user?.role === 'ADMIN';
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting);

  // Update greeting every minute in case the user stays on the page across time boundaries
  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (hasUnread) setHasUnread(false);
  };

  return (
    <header className={`sticky top-0 z-40 ${isAdmin ? 'bg-[#0B1120]' : 'surface-panel border-b border-slate-800/50 px-4'} py-3`}>
      <div className={`flex items-center justify-between gap-3 ${isAdmin ? 'px-6 border-b border-slate-800/60 pb-3' : 'max-w-7xl mx-auto'}`}>
        
        {/* Left side: Branding for Non-Admins, Greeting for Admins */}
        <div className="flex items-center">
          {isAdmin ? (
            <div>
              <h2 className="text-lg font-bold text-white">{greeting}, Admin</h2>
              <p className="text-xs text-slate-400">EduInspire’26 Event Control</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight">EduInspire’26</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Voting Portal</span>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          
          {/* Status Badge */}
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <span className="relative flex h-2 w-2">
                {isEvaluationOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isEvaluationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {isEvaluationOpen ? 'LIVE' : 'CLOSED'}
              </span>
            </div>
          )}

          {/* Notifications */}
          {isAdmin && (
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Bell className="w-5 h-5" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#0B1120]"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 surface-panel border border-slate-800/60 rounded-xl shadow-2xl overflow-hidden animate-fade-up z-50">
                  <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-[#172033]/80">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">2 New</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-4 border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors cursor-pointer">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Voting is LIVE</p>
                          <p className="text-xs text-slate-400 leading-relaxed">The evaluation portal is currently open for all judges and audience members.</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-mono">Just now</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-slate-800/20 transition-colors cursor-pointer">
                      <div className="flex gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Welcome Admin</p>
                          <p className="text-xs text-slate-400 leading-relaxed">System loaded successfully. You have full access to dashboard controls.</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-mono">2h ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile */}
          {user && (
            <div className={`flex items-center gap-3 ${isAdmin ? 'pl-4 border-l border-slate-800/60' : ''}`}>
              <div className="hidden sm:block text-right">
                <div className="text-[13px] font-semibold text-slate-200">{user.name || user.userId}</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{user.role}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm border border-indigo-500">
                {(user.name || user.userId).charAt(0).toUpperCase()}
              </div>

              {/* Non-Admin Logout */}
              {!isAdmin && (
                <button
                  onClick={onLogout}
                  className="ml-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
