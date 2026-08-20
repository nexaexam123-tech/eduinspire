import React, { useState, useEffect } from 'react';
import {
  Users, Layers, BarChart3, Clock, AlertTriangle, Play, Pause, Edit2, RotateCcw,
  Sparkles, CheckCircle2, ChevronRight, Building2, GraduationCap
} from 'lucide-react';

function KPICard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="p-5 rounded-2xl flex items-center justify-between group bg-[#E5E4E2] border border-[#C9C9C9] transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg">
      <div>
        <p className="text-[11px] font-bold text-[#55585C] mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-[#111315] tracking-tight">{value}</h3>
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-sm ${colorClass} transition-colors`}>
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

  const handleOpenVotingTimerEdit = () => {
    const total = (isVotingOpen && displaySeconds != null) 
      ? displaySeconds 
      : (eventState?.voting_timer_seconds || 1200);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setVHours(h);
    setVMinutes(m);
    setVSeconds(s);
    setIsEditingTimer(true);
  };

  const handleSaveVotingTimer = async () => {
    const durationSeconds = (parseInt(vHours) || 0) * 3600 + (parseInt(vMinutes) || 0) * 60 + (parseInt(vSeconds) || 0);
    if (durationSeconds <= 0) {
      alert("Please enter a duration greater than 0 seconds.");
      return;
    }
    await handleVotingAction('EDIT', durationSeconds);
  };

  const handleOpenPTimerEdit = () => {
    const total = eventState?.timer_remaining ?? (eventState?.timer_seconds || 420);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setPHours(h);
    setPMinutes(m);
    setPSeconds(s);
    setIsEditingPTimer(true);
  };

  const handleVotingAction = async (action, explicitDuration = null) => {
    setActionLoading(true);
    let durationSeconds = explicitDuration;
    if (durationSeconds == null && (action === 'START' || action === 'EDIT')) {
      durationSeconds = (parseInt(vHours) || 0) * 3600 + (parseInt(vMinutes) || 0) * 60 + (parseInt(vSeconds) || 0);
    }
    try {
      await fetch('/api/event/voting/global-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, durationSeconds: durationSeconds || undefined })
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
        const nextAction = eventState?.timer_running === 1 ? 'pause' : 'start';
        await fetch('/api/event/presentation/timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: nextAction })
        });
      } else if (action === 'RESET') {
        await fetch('/api/event/presentation/timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        });
      } else if (action === 'EDIT') {
        const totalSec = pHours * 3600 + pMinutes * 60 + pSeconds;
        await fetch('/api/event/presentation/set-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationSeconds: totalSec })
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
      <div className="surface-card overflow-hidden border border-[#C9C9C9] bg-[#F1F0EE]">
        <div className="p-5 border-b border-[#C9C9C9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#111315]">Live Presentation & Voting Stage</h3>
              {activeTeam && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Team #{activeTeam.presentation_order} ({activeTeam.team_code})
                </span>
              )}
            </div>
            <p className="text-xs text-[#55585C] mt-1">Select a team number below to assign the stage and control real-time voting.</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border self-start sm:self-auto flex items-center gap-1.5 ${
            isVotingOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isVotingOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            {isVotingOpen ? 'VOTING IS LIVE' : 'VOTING CLOSED'}
          </div>
        </div>

        {/* Active Team Presenting Panel */}
        {activeTeam ? (
          <div className="p-5 border-b border-[#C9C9C9] bg-[#E5E4E2] flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center shrink-0 shadow-sm relative">
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                #{activeTeam.presentation_order}
              </span>
              <Building2 className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <div className="inline-block px-3 py-1 bg-white border border-[#C9C9C9] rounded-lg text-[10px] font-bold text-[#55585C] uppercase tracking-widest mb-1 shadow-sm">
                Active Presentation
              </div>
              <h2 className="text-3xl font-extrabold text-[#111315] tracking-tight">{activeTeam.team_name}</h2>
              <p className="text-sm text-[#55585C] font-medium">{activeTeam.college_name}</p>
              {activeTeam.project_title && (
                <p className="text-sm font-bold text-indigo-600 mt-2">{activeTeam.project_title}</p>
              )}
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
          <div className="p-5 border-b border-[#C9C9C9] text-center text-[#55585C] text-sm bg-white">
            No team currently selected. Click a team number below to assign the stage.
          </div>
        )}
        
        {/* Timer Control Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#C9C9C9] bg-white">
          
          {/* Presentation Timer */}
          <div className="p-5 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Presentation Timer</h4>
              <div className="text-4xl font-mono font-bold tracking-tight text-[#111315]">
                {formatTime(eventState?.timer_remaining)}
              </div>
              
              {isEditingPTimer ? (
                <div className="flex items-center gap-1.5 mt-3 animate-fade-up bg-slate-100 p-2 rounded-xl border border-slate-300">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Hr</span>
                    <input
                      type="number" min="0" max="23"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={pHours} 
                      onChange={e => setPHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-base mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Min</span>
                    <input
                      type="number" min="0" max="59"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={pMinutes} 
                      onChange={e => setPMinutes(e.target.value === '' ? '' : Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-base mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Sec</span>
                    <input
                      type="number" min="0" max="59"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={pSeconds} 
                      onChange={e => setPSeconds(e.target.value === '' ? '' : Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-2 mt-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handlePresentationAction('EDIT')}
                      className="btn-primary text-xs py-1.5 px-3 h-9"
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingPTimer(false)} 
                      className="btn-secondary text-xs py-1.5 px-3 h-9"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={handleOpenPTimerEdit} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 mt-1">
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
              <h4 className="text-xs font-semibold text-[#55585C] uppercase tracking-wider">Voting Timer</h4>
              <div className="text-4xl font-mono font-bold tracking-tight text-[#111315]">
                {isVotingOpen ? (
                  formatTime(displaySeconds)
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span>--:--</span>
                    <span className="text-xs font-sans font-semibold text-slate-500">
                      (Set: {formatTime(eventState?.voting_timer_seconds || 1200)})
                    </span>
                  </div>
                )}
              </div>
              
              {isEditingTimer ? (
                <div className="flex items-center gap-1.5 mt-3 animate-fade-up bg-slate-100 p-2 rounded-xl border border-slate-300">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Hr</span>
                    <input
                      type="number" min="0" max="23"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={vHours} 
                      onChange={e => setVHours(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-base mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Min</span>
                    <input
                      type="number" min="0" max="59"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={vMinutes} 
                      onChange={e => setVMinutes(e.target.value === '' ? '' : Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-base mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Sec</span>
                    <input
                      type="number" min="0" max="59"
                      className="w-12 h-9 text-center text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 outline-none text-[#111315]"
                      value={vSeconds} 
                      onChange={e => setVSeconds(e.target.value === '' ? '' : Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-2 mt-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleSaveVotingTimer}
                      className="btn-primary text-xs py-1.5 px-3 h-9"
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingTimer(false)} 
                      className="btn-secondary text-xs py-1.5 px-3 h-9"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={handleOpenVotingTimerEdit} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 mt-1">
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
        <div className="p-5 border-t border-[#C9C9C9] bg-[#E5E4E2]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#111315] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Click Any Team Number to Select & Start Vote</span>
            </h4>
            <span className="text-xs text-[#55585C] font-bold">{teams.length} Teams Registered</span>
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
                      : 'bg-white border border-[#C9C9C9] text-[#111315] hover:border-indigo-400 hover:bg-indigo-50 shadow-sm'
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
