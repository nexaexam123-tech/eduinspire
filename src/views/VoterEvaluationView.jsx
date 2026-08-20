import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertTriangle, Send, LogOut, Check } from 'lucide-react';
import SliderScore, { getCriteriaList } from '../components/SliderScore';

export default function VoterEvaluationView({ user, onLogout }) {
  const [eventData, setEventData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // State for all team scores: { [teamId]: number }
  const [scores, setScores] = useState({});
  const [categoryScores, setCategoryScores] = useState({});

  const fetchData = async () => {
    try {
      const [stateRes, teamsRes, myStatusRes] = await Promise.all([
        fetch('/api/event/state'),
        fetch('/api/teams'),
        fetch(`/api/evaluation/my-status?voterId=${user.userId}`)
      ]);

      const stateJson = await stateRes.json();
      const teamsJson = await teamsRes.json();
      const statusJson = await myStatusRes.json();

      setEventData(stateJson);
      setTeams(teamsJson);
      
      if (statusJson.evaluatedTeamIds && statusJson.evaluatedTeamIds.length > 0) {
        setHasVoted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user.userId]);

  const handleCategoryChange = (teamId, catId, max, value) => {
    let val = value;
    if (val !== '') {
      val = parseInt(value, 10);
      if (isNaN(val)) val = '';
      else if (val < 0) val = 0;
      else if (val > max) val = max;
    }
    
    setCategoryScores(prevCats => {
      const teamScores = { ...(prevCats[teamId] || {}) };
      teamScores[catId] = val;
      
      setScores(prevScores => {
        const total = getCriteriaList().reduce((sum, cat) => sum + (parseInt(teamScores[cat.key]) || 0), 0);
        return { ...prevScores, [teamId]: total };
      });

      return { ...prevCats, [teamId]: teamScores };
    });
  };

  const isOwnTeam = (teamId) => {
    return user.role === 'PARTICIPANT' && parseInt(user.teamId) === parseInt(teamId);
  };

  const requiredCount = user.role === 'PARTICIPANT' && user.teamId ? Math.max(0, teams.length - 1) : teams.length;
  
  // Count only votes that are valid numbers, ignoring own team just in case
  const votedCount = teams.filter(t => !isOwnTeam(t.id) && scores[t.id] !== undefined && scores[t.id] !== '').length;
  const isComplete = requiredCount > 0 && votedCount === requiredCount;
  const progressPercent = requiredCount > 0 ? (votedCount / requiredCount) * 100 : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const eligibleTeams = teams.filter(t => !isOwnTeam(t.id));
    const votesPayload = eligibleTeams.map(t => ({
      teamId: t.id,
      totalScore: parseInt(scores[t.id], 10) || 0
    }));

    try {
      const res = await fetch('/api/evaluation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: user.userId,
          voterRole: user.role,
          voterTeamId: user.teamId,
          votes: votesPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed.');
      }

      setHasVoted(true);
      setShowConfirmModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const attemptSubmit = (e) => {
    e.preventDefault();
    if (!isComplete) {
      setError(`Please evaluate all ${requiredCount} teams before submitting.`);
      return;
    }
    setShowConfirmModal(true);
  };

  if (loading && !eventData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Voting Session...</p>
        </div>
      </div>
    );
  }

  const { state } = eventData || {};
  const isVotingOpen = state?.evaluation_status === 'OPEN';

  const formatTime = (totalSec) => {
    if (totalSec == null) return '--:--';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto pb-32">
      {/* Mobile Header */}
      <div className="surface-panel p-4 mb-4 flex items-center justify-between sticky top-4 z-40 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">
            {user.role === 'PARTICIPANT' ? 'Faculty Voting' : 'Audience Voting'}
          </h2>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span className="font-mono text-indigo-300 font-bold">{user.email || user.userId}</span>
            {user.collegeName && <span> &bull; {user.collegeName}</span>}
          </div>
        </div>
        <button onClick={onLogout} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Case 1: Already Evaluated */}
      {hasVoted && (
        <div className="surface-card p-10 text-center space-y-5 animate-fade-up">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">Vote Submitted Successfully</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your vote has been recorded and locked. Thank you for your participation.
            </p>
          </div>
        </div>
      )}

      {/* Case 2: Voting is Closed */}
      {!isVotingOpen && !hasVoted && (
        <div className="surface-card p-10 text-center space-y-5 animate-fade-up">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">Waiting for Voting</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Voting will become available when the administrator starts the session.
            </p>
          </div>
        </div>
      )}

      {/* Case 3: Voting OPEN, Not Voted */}
      {isVotingOpen && !hasVoted && (
        <div className="space-y-4 animate-fade-up">
          
          {/* Status & Progress Card */}
          <div className="surface-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Voting Status</h3>
                <p className="text-xs text-slate-400 mt-1">{requiredCount} votes required</p>
              </div>
              {state?.timer_running === 1 && (
                <div className="text-right ml-4">
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Presentation Timer</div>
                  <div className="text-xl font-mono font-bold text-rose-400 animate-pulse-subtle">
                    {formatTime(state?.timer_remaining)}
                  </div>
                </div>
              )}
              {state?.voting_timer_running === 1 && (
                <div className="text-right ml-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Voting Timer</div>
                  <div className="text-xl font-mono font-bold text-indigo-400 animate-pulse-subtle">
                    {formatTime(state?.voting_timer_remaining)}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-300">{votedCount} / {requiredCount} votes completed</span>
                <span className="text-indigo-400">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={attemptSubmit} className="space-y-4">
            {teams.map((team, index) => {
              const ownTeam = isOwnTeam(team.id);
              const hasScore = scores[team.id] !== undefined && scores[team.id] !== '';

              if (ownTeam) {
                return (
                  <div key={team.id} className="surface-card p-5 border-dashed border-slate-700/50 opacity-70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold tracking-wider mb-2">YOUR TEAM</span>
                      <div className="font-bold text-white text-base">{team.team_name}</div>
                      <div className="text-xs text-slate-400 mt-1">{team.college_name}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 text-left sm:text-right">
                      You cannot vote for your own team.
                    </div>
                  </div>
                );
              }

              const currentScore = scores[team.id] !== undefined && scores[team.id] !== '' ? scores[team.id] : 0;

              return (
                <div key={team.id} className={`surface-card p-4 sm:p-5 transition-all duration-300 ${hasScore ? 'border-indigo-500/30 bg-indigo-500/5' : ''}`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-500">#{index + 1}</span>
                          <span className="text-sm font-bold text-white leading-tight">{team.team_name}</span>
                          {hasScore && <Check className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="text-xs text-slate-400">{team.college_name}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`px-3 py-1.5 border rounded-lg font-mono font-bold text-lg shadow-inner transition-colors ${
                          hasScore ? 'bg-indigo-900/30 border-indigo-500/40 text-indigo-400' : 'bg-[#172033] border-slate-700 text-slate-400'
                        }`}>
                          {hasScore ? currentScore : '--'} <span className="text-slate-500 font-normal text-xs">/ 100</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-700/50 mt-4">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
                        Evaluation Criteria
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mt-4">
                      {getCriteriaList().map(crit => {
                        const catVal = categoryScores[team.id]?.[crit.key];
                        return (
                          <SliderScore
                            key={crit.key}
                            categoryKey={crit.key}
                            title={crit.title}
                            max={crit.max}
                            description={crit.description}
                            value={catVal !== undefined ? catVal : ''}
                            onChange={(catKey, val) => handleCategoryChange(team.id, catKey, crit.max, val)}
                          />
                        );
                      })}
                    </div>
                    </div>
                    <div className="flex justify-between items-center pt-5 border-t border-slate-700/50 mt-6">
                      <span className="text-sm font-bold text-white">TOTAL SCORE:</span>
                      <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold text-indigo-400">{currentScore}</span>
                          <span className="text-xs text-slate-500 font-mono w-8">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </div>
              );
            })}

            {/* Sticky Submit Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 surface-panel border-t border-slate-800/80 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:block">
                  {isComplete ? (
                    <span className="text-emerald-400 text-sm font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> All votes complete
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm font-medium">
                      {requiredCount - votedCount} votes remaining
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !isComplete}
                  className="btn-primary w-full sm:w-auto px-8 py-3 text-base flex-1 sm:flex-none justify-center"
                >
                  <Send className="w-5 h-5" />
                  Review & Submit
                </button>
              </div>
            </div>
          </form>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
              <div className="w-full max-w-sm surface-panel p-4 shadow-2xl relative">
                <h3 className="text-xl font-bold text-white mb-2">Submit your votes?</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  You must select all required teams before submitting. Once submitted, your vote cannot be edited.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    disabled={submitting}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Vote'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
