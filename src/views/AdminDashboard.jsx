import React, { useState, useEffect } from 'react';
import {
  Users, Layers, BarChart3, Clock, AlertTriangle, Play, Pause, Edit2, RotateCcw,
  Sparkles, CheckCircle2, ChevronRight, Building2, GraduationCap
} from 'lucide-react';

function KPICard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="surface-card p-5 flex items-center justify-between group hover:border-indigo-500/20 transition-all">
      <div>
        <p className="text-[13px] font-medium text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800/50 ${colorClass} group-hover:bg-slate-800 transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // Client-side countdown display (ticks every second between server polls)
  const [displaySeconds, setDisplaySeconds] = useState(null);

  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [vHours, setVHours] = useState(0);
  const [vMinutes, setVMinutes] = useState(20);
  const [vSeconds, setVSeconds] = useState(0);

  const [isEditingPTimer, setIsEditingPTimer] = useState(false);
  const [pHours, setPHours] = useState(0);
  const [pMinutes, setPMinutes] = useState(7);
  const [pSeconds, setPSeconds] = useState(0);

  const fetchDashboard = async (syncDisplay = false) => {
    try {
      const [dashRes, teamsRes] = await Promise.all([
        fetch('/api/results/dashboard'),
        fetch('/api/teams')
      ]);

      if (!dashRes.ok) throw new Error('Failed to fetch dashboard data');
      const data = await dashRes.json();
      setDashboardData(data);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      // Sync active team
      if (data?.eventState?.current_team_id) {
        setSelectedTeamId(data.eventState.current_team_id);
      }

      // Sync display counter with server
      if (syncDisplay) {
        const remaining = data?.eventState?.voting_timer_remaining;
        if (remaining != null) setDisplaySeconds(Math.round(remaining));
      } else {
        setDisplaySeconds(prev => {
          if (prev === null) {
            const remaining = data?.eventState?.voting_timer_remaining;
            return remaining != null ? Math.round(remaining) : null;
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(), 3000);
    return () => clearInterval(interval);
  }, []);

  // Stable 1-second countdown
  const isVotingRunning =
    dashboardData?.eventState?.evaluation_status === 'OPEN' &&
    dashboardData?.eventState?.voting_timer_running === 1;

  useEffect(() => {
    if (!isVotingRunning) return;
    const tick = setInterval(() => {
      setDisplaySeconds(prev => (prev != null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [isVotingRunning]);

  const handleVotingAction = async (action) => {
    setActionLoading(true);
    let durationSeconds = 0;
    if (action === 'START' || action === 'EDIT') {
      durationSeconds = (vHours * 3600) + (vMinutes * 60) + vSeconds;
    }
    try {
      await fetch('/api/event/voting/global-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, durationSeconds })
      });
      setIsEditingTimer(false);
      fetchDashboard(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Select team and optionally start voting
  const handleSelectTeam = async (teamId, autoStartVote = false) => {
    setActionLoading(true);
    try {
      // 1. Select the presenting team
      await fetch('/api/event/presentation/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      setSelectedTeamId(teamId);

      // 2. If requested to start voting or presentation
      if (autoStartVote) {
        const durationSeconds = (vHours * 3600) + (vMinutes * 60) + vSeconds || 1200;
        await fetch('/api/event/voting/global-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'START', durationSeconds })
        });
        await fetch('/api/event/presentation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId })
        });
      }

      fetchDashboard(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePresentationAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'TOGGLE') {
        await fetch('/api/event/presentation/timer', { method: 'POST' });
      } else if (action === 'EDIT') {
        const totalSec = pHours * 3600 + pMinutes * 60 + pSeconds;
        await fetch('/api/event/presentation/set-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timerSeconds: totalSec })
        });
        setIsEditingPTimer(false);
      }
      await fetchDashboard(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const { stats, eventState, currentTeam, judgeTies, audienceTies } = dashboardData;
  const isVotingOpen = eventState?.evaluation_status === 'OPEN';
  const hasTies = (judgeTies && judgeTies.length > 0) || (audienceTies && audienceTies.length > 0);

  const activeTeam = teams.find(t => t.id === (selectedTeamId || eventState?.current_team_id)) || currentTeam;

  const formatTime = (totalSec) => {
    if (totalSec == null) return '--:--';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Tie Alert */}
      {hasTies && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h4 className="text-sm font-bold text-amber-400">Tie Detected in Rankings</h4>
              <p className="text-xs text-amber-500/80">Manual resolution required.</p>
            </div>
          </div>
          <button onClick={() => onNavigate('RANKINGS')} className="btn-secondary text-xs py-1.5 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/20">
            Resolve Ties
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Teams" value={stats.totalTeams} icon={Layers} colorClass="text-indigo-400" />
        <KPICard title="Judges" value={stats.totalJudges} icon={BarChart3} colorClass="text-purple-400" />
        <KPICard title="Participants" value={stats.totalParticipants} icon={Users} colorClass="text-cyan-400" />
        <KPICard title="Audience" value={stats.totalAudience} icon={Users} colorClass="text-emerald-400" />
      </div>

      {/* Live Stage & Voting Control Panel */}
      <div className="surface-card overflow-hidden">
        <div className="p-5 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#172033]/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Live Presentation & Voting Stage</h3>
              {activeTeam && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Team #{activeTeam.presentation_order} ({activeTeam.team_code})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Select a team number below to assign the stage and control real-time voting.</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border self-start sm:self-auto flex items-center gap-1.5 ${
            isVotingOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isVotingOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            {isVotingOpen ? 'VOTING IS LIVE' : 'VOTING CLOSED'}
          </div>
        </div>

        {/* Active Team Highlight Banner */}
        {activeTeam ? (
          <div className="p-5 border-b border-slate-800/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/30 to-slate-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold text-xs rounded">
                  #{activeTeam.presentation_order}
                </span>
                <span className="font-mono text-xs text-indigo-400 font-bold">{activeTeam.team_code}</span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" /> {activeTeam.college_name}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                {activeTeam.team_name}
              </h4>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" /> {activeTeam.dept_name}
              </p>
            </div>

            {/* Quick Action Button for Selected Team */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              {!isVotingOpen ? (
                <button
                  disabled={actionLoading}
                  onClick={() => handleSelectTeam(activeTeam.id, true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Voting for Team #{activeTeam.presentation_order}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVotingAction('RESET')}
                    className="btn-secondary py-2.5 px-4 text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Timer
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      if (window.confirm(`Stop voting for Team #${activeTeam.presentation_order}?`)) {
                        handleVotingAction('STOP');
                      }
                    }}
                    className="btn-danger py-2.5 px-5 text-xs font-semibold"
                  >
                    <Pause className="w-3.5 h-3.5" /> Stop Voting
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 border-b border-slate-800/40 text-center text-slate-500 text-sm">
            No team currently selected. Click a team number below to assign the stage.
          </div>
        )}
        
        {/* Timer Control Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 bg-slate-900/20">
          
          {/* Presentation Timer */}
          <div className="p-5 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Presentation Timer</h4>
              <div className="text-4xl font-mono font-bold tracking-tight text-white">
                {formatTime(eventState?.timer_remaining)}
              </div>
              
              {isEditingPTimer ? (
                <div className="flex items-center gap-2 mt-3 animate-fade-up">
                  <input
                    type="number" min="0" max="23"
                    className="form-input w-14 text-center text-xs py-1"
                    value={pHours} onChange={e => setPHours(Number(e.target.value))}
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="number" min="0" max="59"
                    className="form-input w-14 text-center text-xs py-1"
                    value={pMinutes} onChange={e => setPMinutes(Number(e.target.value))}
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="number" min="0" max="59"
                    className="form-input w-14 text-center text-xs py-1"
                    value={pSeconds} onChange={e => setPSeconds(Number(e.target.value))}
                  />
                  <button
                    disabled={actionLoading}
                    onClick={() => handlePresentationAction('EDIT')}
                    className="btn-primary text-xs py-1 px-3 ml-1"
                  >
                    Save
                  </button>
                  <button onClick={() => setIsEditingPTimer(false)} className="btn-secondary text-xs py-1 px-3">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditingPTimer(true)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 mt-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Duration
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full xl:w-auto">
              <button
                disabled={actionLoading || isEditingPTimer}
                onClick={() => handlePresentationAction('TOGGLE')}
                className={`py-2 px-5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  eventState?.timer_running === 1 
                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                }`}
              >
                {eventState?.timer_running === 1 ? (
                  <><Pause className="w-4 h-4" /> Pause Timer</>
                ) : (
                  <><Play className="w-4 h-4" /> Start Timer</>
                )}
              </button>
            </div>
          </div>

          {/* Voting Timer */}
          <div className="p-5 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voting Timer</h4>
              <div className="text-4xl font-mono font-bold tracking-tight text-white">
                {isVotingOpen ? formatTime(displaySeconds) : '--:--'}
              </div>
              
              {isEditingTimer ? (
                <div className="flex items-center gap-2 mt-3 animate-fade-up">
                  <input
                    type="number" min="0" max="23"
                    className="form-input w-14 text-center text-xs py-1"
                    value={vHours} onChange={e => setVHours(Number(e.target.value))}
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="number" min="0" max="59"
                    className="form-input w-14 text-center text-xs py-1"
                    value={vMinutes} onChange={e => setVMinutes(Number(e.target.value))}
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="number" min="0" max="59"
                    className="form-input w-14 text-center text-xs py-1"
                    value={vSeconds} onChange={e => setVSeconds(Number(e.target.value))}
                  />
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVotingAction(isVotingOpen ? 'EDIT' : 'START')}
                    className="btn-primary text-xs py-1 px-3 ml-1"
                  >
                    Save
                  </button>
                  <button onClick={() => setIsEditingTimer(false)} className="btn-secondary text-xs py-1 px-3">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditingTimer(true)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 mt-1">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Duration
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full xl:w-auto">
              {!isVotingOpen ? (
                <button
                  disabled={actionLoading || isEditingTimer}
                  onClick={() => handleVotingAction('START')}
                  className="btn-success py-2 px-5 text-sm w-full"
                >
                  <Play className="w-4 h-4" /> Start Global Voting
                </button>
              ) : (
                <button
                  disabled={actionLoading || isEditingTimer}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to stop voting? This will lock all current votes.')) {
                      handleVotingAction('STOP');
                    }
                  }}
                  className="btn-danger py-2 px-5 text-sm w-full"
                >
                  <Pause className="w-4 h-4" /> Stop Voting
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Team Number Grid */}
        <div className="p-5 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Click Any Team Number to Select & Start Vote</span>
            </h4>
            <span className="text-xs text-slate-400">{teams.length} Teams Registered</span>
          </div>

          {/* Quick Team Number Badges */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-48 overflow-y-auto p-1">
            {teams.map((t) => {
              const isSelected = activeTeam?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTeam(t.id, false)}
                  title={`${t.team_code} - ${t.college_name}: ${t.team_name}`}
                  className={`p-2 rounded-xl text-center font-mono text-xs font-bold transition-all relative group ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg shadow-indigo-900/40 scale-105'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 font-normal group-hover:text-slate-200">
                    {t.team_code}
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    #{t.presentation_order}
                  </div>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0B1120]"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
