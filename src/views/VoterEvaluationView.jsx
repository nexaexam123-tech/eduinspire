import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Send, 
  LogOut, 
  Check, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ListChecks, 
  Radio, 
  Edit3, 
  X,
  Sparkles,
  Save
} from 'lucide-react';
import SliderScore, { getCriteriaList } from '../components/SliderScore';

export default function VoterEvaluationView({ user, onLogout }) {
  const [eventData, setEventData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [submittedTeamIds, setSubmittedTeamIds] = useState([]);
  
  // State for all team scores: { [teamId]: number }
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem(`eduinspire_scores_${user.userId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [categoryScores, setCategoryScores] = useState(() => {
    const saved = localStorage.getItem(`eduinspire_categoryScores_${user.userId}`);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(`eduinspire_scores_${user.userId}`, JSON.stringify(scores));
  }, [scores, user.userId]);

  useEffect(() => {
    localStorage.setItem(`eduinspire_categoryScores_${user.userId}`, JSON.stringify(categoryScores));
  }, [categoryScores, user.userId]);

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
      
      if (statusJson.evaluatedTeamIds) {
        setSubmittedTeamIds(statusJson.evaluatedTeamIds);
      }

      // Merge server-saved scores if any
      if (statusJson.scores && Object.keys(statusJson.scores).length > 0) {
        setScores(prev => ({ ...statusJson.scores, ...prev }));
      }
      if (statusJson.categoryScores && Object.keys(statusJson.categoryScores).length > 0) {
        setCategoryScores(prev => ({ ...statusJson.categoryScores, ...prev }));
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

  const isOwnTeam = (teamId) => {
    return user.role === 'PARTICIPANT' && parseInt(user.teamId) === parseInt(teamId);
  };

  const eligibleTeams = teams.filter(t => !isOwnTeam(t.id));
  const currentLiveTeamId = eventData?.state?.current_team_id;

  // Set default active team if not already chosen
  useEffect(() => {
    if (!activeTeamId && eligibleTeams.length > 0) {
      if (currentLiveTeamId && eligibleTeams.some(t => t.id === currentLiveTeamId)) {
        setActiveTeamId(currentLiveTeamId);
      } else {
        setActiveTeamId(eligibleTeams[0].id);
      }
    }
  }, [eligibleTeams, currentLiveTeamId, activeTeamId]);

  const handleCategoryChange = (teamId, catId, max, value) => {
    let val = value;
    if (val !== '') {
      val = parseInt(value, 10);
      if (isNaN(val)) val = 0;
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

  const requiredCount = user.role === 'PARTICIPANT' && user.teamId ? Math.max(0, teams.length - 1) : teams.length;
  const votedCount = eligibleTeams.filter(t => scores[t.id] !== undefined && scores[t.id] !== '').length;
  const isComplete = requiredCount > 0 && votedCount === requiredCount;
  const progressPercent = requiredCount > 0 ? (votedCount / requiredCount) * 100 : 0;

  const currentTeamIndex = eligibleTeams.findIndex(t => t.id === activeTeamId);
  const currentActiveTeam = eligibleTeams[currentTeamIndex] || eligibleTeams[0];

  const handlePrevTeam = () => {
    if (currentTeamIndex > 0) {
      setActiveTeamId(eligibleTeams[currentTeamIndex - 1].id);
    }
  };

  const handleNextTeam = () => {
    if (currentTeamIndex < eligibleTeams.length - 1) {
      setActiveTeamId(eligibleTeams[currentTeamIndex + 1].id);
    }
  };

  const handleBottomReviewAndSubmit = () => {
    if (currentActiveTeam) {
      const activeCats = categoryScores[currentActiveTeam.id] || {};
      const activeTotal = getCriteriaList().reduce((sum, cat) => sum + (parseInt(activeCats[cat.key]) || 0), 0);
      setScores(prev => {
        const nextScores = { ...prev, [currentActiveTeam.id]: activeTotal };
        return nextScores;
      });
    }
    setError(null);
    setShowPreviewModal(true);
  };

  // Submit all evaluated teams
  const handleSubmitAll = async () => {
    setSubmitting(true);
    setError(null);

    // Make sure active team score is included
    let allCurrentScores = { ...scores };
    if (currentActiveTeam) {
      const activeCats = categoryScores[currentActiveTeam.id] || {};
      const activeTotal = getCriteriaList().reduce((sum, cat) => sum + (parseInt(activeCats[cat.key]) || 0), 0);
      allCurrentScores[currentActiveTeam.id] = activeTotal;
      setScores(allCurrentScores);
    }

    const scoredTeams = eligibleTeams.filter(t => allCurrentScores[t.id] !== undefined && allCurrentScores[t.id] !== '');
    if (scoredTeams.length === 0) {
      setError("Please evaluate at least one team before submitting.");
      setSubmitting(false);
      return;
    }

    const votesPayload = scoredTeams.map(t => {
      const cats = categoryScores[t.id] || {};
      return {
        teamId: t.id,
        totalScore: parseInt(allCurrentScores[t.id], 10) || 0,
        studentImpact: parseInt(cats.studentImpact, 10) || 0,
        facultyImpact: parseInt(cats.facultyImpact, 10) || 0,
        adminImpact: parseInt(cats.adminImpact, 10) || 0,
        socialImpact: parseInt(cats.socialImpact, 10) || 0,
        innovation: parseInt(cats.innovation, 10) || 0,
        implementation: parseInt(cats.implementation, 10) || 0,
        outcomes: parseInt(cats.outcomes, 10) || 0,
        replicability: parseInt(cats.replicability, 10) || 0
      };
    });

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

      setSubmittedTeamIds(prev => Array.from(new Set([...prev, ...scoredTeams.map(t => t.id)])));
      setShowPreviewModal(false);
      setSuccessToast(`Evaluations for ${scoredTeams.length} team(s) submitted successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit a single team immediately
  const handleSingleTeamSubmit = async (teamId) => {
    setSubmitting(true);
    setError(null);

    const teamScore = scores[teamId];
    if (teamScore === undefined || teamScore === '') {
      alert("Please adjust the score sliders for this team before submitting.");
      setSubmitting(false);
      return;
    }

    const cats = categoryScores[teamId] || {};
    const votesPayload = [{
      teamId,
      totalScore: parseInt(teamScore, 10) || 0,
      studentImpact: parseInt(cats.studentImpact, 10) || 0,
      facultyImpact: parseInt(cats.facultyImpact, 10) || 0,
      adminImpact: parseInt(cats.adminImpact, 10) || 0,
      socialImpact: parseInt(cats.socialImpact, 10) || 0,
      innovation: parseInt(cats.innovation, 10) || 0,
      implementation: parseInt(cats.implementation, 10) || 0,
      outcomes: parseInt(cats.outcomes, 10) || 0,
      replicability: parseInt(cats.replicability, 10) || 0
    }];

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
      if (!res.ok) throw new Error(data.error || 'Failed to submit score.');

      setSubmittedTeamIds(prev => Array.from(new Set([...prev, teamId])));
      const teamObj = eligibleTeams.find(t => t.id === teamId);
      setSuccessToast(`Score for "${teamObj?.team_name || 'Team'}" submitted successfully! (${teamScore}/100)`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPreview = (e) => {
    if (e) e.preventDefault();
    setError(null);
    setShowPreviewModal(true);
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
    <div className="max-w-4xl mx-auto pb-32">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-fade-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="surface-panel p-4 mb-4 flex items-center justify-between sticky top-4 z-40 shadow-sm border border-[#C9C9C9]">
        <div>
          <h2 className="text-lg font-bold text-[#111315] leading-tight flex items-center gap-2">
            <span>{user.role === 'PARTICIPANT' ? 'Faculty Evaluation' : 'Audience Evaluation'}</span>
            {isVotingOpen && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Live
              </span>
            )}
          </h2>
          <div className="text-xs text-[#55585C] mt-0.5">
            <span className="font-mono text-indigo-700 font-bold">{user.email || user.userId}</span>
            {user.collegeName && <span> &bull; {user.collegeName}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isVotingOpen && (
            <button
              type="button"
              onClick={openPreview}
              className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 border-indigo-200"
            >
              <ListChecks className="w-4 h-4" />
              <span>Preview ({votedCount}/{requiredCount})</span>
            </button>
          )}
          <button 
            onClick={onLogout} 
            title="Log out" 
            className="p-2 rounded-xl bg-[#F1F0EE] border border-[#C9C9C9] text-[#55585C] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Case 1: Voting is Closed */}
      {!isVotingOpen && (
        <div className="surface-card p-10 text-center space-y-5 animate-fade-up border border-[#C9C9C9] bg-[#E5E4E2]">
          <div className="w-20 h-20 bg-indigo-100 border-2 border-indigo-300 rounded-full flex items-center justify-center mx-auto text-indigo-700 shadow-sm">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-[#111315]">Voting is Currently Closed</h3>
            <p className="text-sm font-medium text-[#55585C] max-w-sm mx-auto leading-relaxed">
              Evaluation will become available once the administrator starts the voting session.
            </p>
          </div>
        </div>
      )}

      {/* Case 2: Voting OPEN */}
      {isVotingOpen && (
        <div className="space-y-5 animate-fade-up">
          
          {/* Status & Progress Card */}
          <div className="surface-card p-4 border border-[#C9C9C9]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111315] flex items-center gap-2">
                  <span>Evaluation Progress</span>
                  {isComplete ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      All Teams Scored
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {votedCount} of {requiredCount} Scored
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#55585C] mt-1 font-medium">{requiredCount} total teams to evaluate</p>
              </div>

              <div className="flex items-center gap-4">
                {state?.timer_running === 1 && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Presentation</div>
                    <div className="text-lg font-mono font-bold text-rose-800">
                      {formatTime(state?.timer_remaining)}
                    </div>
                  </div>
                )}
                {state?.voting_timer_running === 1 && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Voting Timer</div>
                    <div className="text-lg font-mono font-bold text-indigo-800">
                      {formatTime(state?.voting_timer_remaining)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#111315]">
                <span>{votedCount} / {requiredCount} teams scored ({submittedTeamIds.length} submitted)</span>
                <span className="text-indigo-700 font-mono">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#C9C9C9] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Team Navigation Tabs */}
            {eligibleTeams.length > 1 && (
              <div className="mt-4 pt-4 border-t border-[#C9C9C9]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#55585C]">Select Team to Evaluate</span>
                  {currentLiveTeamId && (
                    <button
                      type="button"
                      onClick={() => setActiveTeamId(currentLiveTeamId)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                        activeTeamId === currentLiveTeamId 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-[#F1F0EE] border border-[#C9C9C9] text-[#55585C] hover:text-[#111315] hover:bg-white'
                      }`}
                    >
                      <Radio className="w-3 h-3 text-rose-600 animate-pulse" /> Jump to Live Team
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {eligibleTeams.map((team, idx) => {
                    const hasScored = scores[team.id] !== undefined && scores[team.id] !== '';
                    const isSubmitted = submittedTeamIds.includes(team.id);
                    const isSelected = team.id === currentActiveTeam?.id;
                    const isLive = team.id === currentLiveTeamId;

                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setActiveTeamId(team.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-bold'
                            : isSubmitted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            : hasScored
                            ? 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50'
                            : 'bg-[#F1F0EE] border-[#C9C9C9] text-[#55585C] hover:bg-white hover:text-[#111315]'
                        }`}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />}
                        <span>#{team.presentation_order || idx + 1} {team.team_name.length > 12 ? team.team_name.slice(0, 10) + '..' : team.team_name}</span>
                        {hasScored ? (
                          <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-800 font-bold'}`}>
                            {scores[team.id]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#55585C] font-mono">--</span>
                        )}
                        {isSubmitted && <Check className="w-3 h-3 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Evaluation Card */}
          {currentActiveTeam ? (
            <div className="surface-card p-5 sm:p-6 transition-all duration-300 border border-[#C9C9C9]">
              <div className="flex flex-col gap-5">
                
                {/* Team Info Header */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-[#C9C9C9]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#111315]/5 text-[#55585C]">
                        Team #{currentActiveTeam.presentation_order || currentTeamIndex + 1} of {eligibleTeams.length}
                      </span>
                      {currentActiveTeam.id === currentLiveTeamId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-rose-500 animate-pulse" /> LIVE NOW
                        </span>
                      )}
                      {submittedTeamIds.includes(currentActiveTeam.id) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Submitted
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#111315] leading-tight mt-1">{currentActiveTeam.team_name}</h3>
                    <div className="text-sm text-[#55585C] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{currentActiveTeam.college_name}</span>
                      {currentActiveTeam.department && <span>&bull; {currentActiveTeam.department}</span>}
                    </div>
                    {currentActiveTeam.project_title && (
                      <div className="text-sm font-medium text-[#111315] mt-2 bg-[#111315]/5 p-2 rounded-lg">
                        <strong>Project:</strong> {currentActiveTeam.project_title}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className={`px-4 py-2 border rounded-xl font-mono font-bold text-2xl shadow-sm transition-colors ${
                      scores[currentActiveTeam.id] !== undefined && scores[currentActiveTeam.id] !== ''
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-[#C9C9C9] text-[#55585C]'
                    }`}>
                      {scores[currentActiveTeam.id] !== undefined && scores[currentActiveTeam.id] !== '' ? scores[currentActiveTeam.id] : '--'} 
                      <span className="text-[#55585C] font-normal text-xs"> / 100</span>
                    </div>
                    <div className="text-[10px] font-bold text-[#55585C] mt-1.5 uppercase tracking-wider">Total Score</div>
                  </div>
                </div>

                {/* Criteria Sliders */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-bold text-[#111315] uppercase tracking-widest border-l-4 border-indigo-600 pl-2.5">
                    Evaluation Criteria
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
                    {getCriteriaList().map(crit => {
                      const catVal = categoryScores[currentActiveTeam.id]?.[crit.key];
                      return (
                        <SliderScore
                          key={crit.key}
                          categoryKey={crit.key}
                          title={crit.title}
                          max={crit.max}
                          description={crit.description}
                          value={catVal !== undefined ? catVal : ''}
                          onChange={(catKey, val) => handleCategoryChange(currentActiveTeam.id, catKey, crit.max, val)}
                        />
                      );
                    })}
                  </div>

                  {/* Navigation & Action Footer within Card */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-4 border-t border-[#C9C9C9]">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handlePrevTeam}
                        disabled={currentTeamIndex === 0}
                        className="btn-secondary flex-1 sm:flex-none px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTeam}
                        disabled={currentTeamIndex === eligibleTeams.length - 1}
                        className="btn-secondary flex-1 sm:flex-none px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleSingleTeamSubmit(currentActiveTeam.id)}
                        disabled={submitting}
                        className="btn-secondary flex-1 sm:flex-none px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Save className="w-4 h-4 text-emerald-600" />
                        <span>Submit This Team</span>
                      </button>

                      {currentTeamIndex < eligibleTeams.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleNextTeam();
                          }}
                          className="btn-primary flex-1 sm:flex-none px-5 py-2.5 text-xs flex items-center justify-center gap-1.5"
                        >
                          <span>Save & Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={openPreview}
                          className="btn-primary flex-1 sm:flex-none px-5 py-2.5 text-xs flex items-center justify-center gap-1.5"
                        >
                          <ListChecks className="w-4 h-4" />
                          <span>Preview & Finish</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="surface-card p-10 text-center space-y-4 border border-dashed border-[#C9C9C9]">
              <Eye className="w-8 h-8 mx-auto text-[#55585C]" />
              <h3 className="text-lg font-bold text-[#111315]">No Teams Available</h3>
              <p className="text-sm text-[#55585C]">Waiting for teams to be configured by the administrator.</p>
            </div>
          )}

          {/* Sticky Bottom Preview & Finish Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 surface-panel border-t border-[#C9C9C9] p-3 sm:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevTeam}
                  disabled={currentTeamIndex <= 0}
                  className="btn-secondary px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-30"
                  title="Previous Team"
                >
                  <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Prev</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextTeam}
                  disabled={currentTeamIndex >= eligibleTeams.length - 1}
                  className="btn-secondary px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-30"
                  title="Next Team"
                >
                  <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
                </button>

                <div className="hidden md:block text-xs text-[#55585C] font-semibold">
                  <span>{votedCount} of {requiredCount} teams scored</span>
                  {submittedTeamIds.length > 0 && (
                    <span className="text-emerald-700 ml-2 font-bold">({submittedTeamIds.length} submitted)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                <button
                  type="button"
                  onClick={handleBottomReviewAndSubmit}
                  className="btn-secondary px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleBottomReviewAndSubmit}
                  disabled={submitting}
                  className="btn-primary flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Send className="w-4 h-4" />
                  <span>Review & Submit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Preview & Finish Modal */}
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
              <div className="w-full max-w-2xl bg-white max-h-[85vh] flex flex-col shadow-2xl relative border border-[#C9C9C9] rounded-2xl overflow-hidden text-[#111315]">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-[#C9C9C9] flex items-center justify-between bg-[#F1F0EE]">
                  <div>
                    <h3 className="text-lg font-bold text-[#111315] flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-indigo-600" />
                      <span>Evaluation Review & Preview</span>
                    </h3>
                    <p className="text-xs text-[#55585C] mt-0.5 font-medium">
                      Review all team scores before submitting.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowPreviewModal(false)}
                    className="p-1.5 rounded-lg text-[#55585C] hover:text-[#111315] hover:bg-[#E5E4E2] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content / Team Score List */}
                <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-white">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F1F0EE] border border-[#C9C9C9] text-xs">
                    <div className="text-[#111315] font-semibold">
                      Scored: <strong className={votedCount > 0 ? 'text-emerald-700' : 'text-amber-700'}>{votedCount} / {requiredCount} Teams</strong>
                    </div>
                    {votedCount > 0 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ready to submit {votedCount} score{votedCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> No scores entered yet
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-[#C9C9C9] rounded-xl border border-[#C9C9C9] bg-white overflow-hidden">
                    {eligibleTeams.map((team, idx) => {
                      const hasScored = scores[team.id] !== undefined && scores[team.id] !== '';
                      const isSubmitted = submittedTeamIds.includes(team.id);
                      const teamScore = hasScored ? scores[team.id] : null;
                      const catData = categoryScores[team.id] || {};

                      return (
                        <div 
                          key={team.id} 
                          className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F1F0EE] transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isSubmitted
                                ? 'bg-emerald-100 text-emerald-800'
                                : hasScored 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-[#E5E4E2] text-[#55585C]'
                            }`}>
                              {hasScored ? <Check className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[#111315] truncate flex items-center gap-2">
                                <span>{team.team_name}</span>
                                <span className="text-[10px] text-[#55585C] font-mono">#{team.presentation_order || idx + 1}</span>
                                {isSubmitted && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                    Submitted
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#55585C] truncate">{team.college_name}</div>
                              {hasScored && (
                                <div className="text-[11px] text-[#55585C] mt-1 flex flex-wrap gap-x-2">
                                  {getCriteriaList().map(c => (
                                    <span key={c.key} className="text-[#55585C]">
                                      {c.title.split('.')[0]}: <strong className="text-[#111315]">{catData[c.key] || 0}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              {hasScored ? (
                                <div className="font-mono font-bold text-base text-indigo-700">
                                  {teamScore} <span className="text-[10px] text-[#55585C]">/ 100</span>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-[#55585C] bg-[#F1F0EE] px-2 py-0.5 rounded">
                                  Not Scored
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTeamId(team.id);
                                setShowPreviewModal(false);
                              }}
                              className="p-1.5 rounded-lg bg-[#F1F0EE] border border-[#C9C9C9] text-[#55585C] hover:text-[#111315] hover:bg-[#E5E4E2] transition-colors"
                              title="Edit score for this team"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-[#C9C9C9] bg-[#F1F0EE] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-[#55585C] font-medium text-center sm:text-left">
                    {votedCount === requiredCount ? (
                      <span className="text-emerald-700 font-bold">All teams scored! Click submit to record all evaluations.</span>
                    ) : votedCount > 0 ? (
                      <span className="text-[#111315]">Ready to submit {votedCount} scored team(s).</span>
                    ) : (
                      <span className="text-amber-800 font-bold">Please score at least one team before submitting.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button 
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      disabled={submitting}
                      className="btn-secondary flex-1 sm:flex-none px-4 py-2 text-xs"
                    >
                      Back to Editing
                    </button>

                    <button 
                      type="button"
                      onClick={handleSubmitAll}
                      disabled={submitting || votedCount === 0}
                      className="btn-primary flex-1 sm:flex-none px-6 py-2 text-xs font-bold shadow-lg disabled:opacity-40"
                    >
                      {submitting ? 'Submitting...' : `Submit ${votedCount > 0 ? `${votedCount} Team Votes` : 'Votes'}`}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
