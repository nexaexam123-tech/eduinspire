import React, { useState, useEffect } from 'react';
import {
  Trophy, Award, Sparkles, AlertTriangle, ArrowUp, ArrowDown, Lock, CheckCircle2,
  Shield, DollarSign, Save, Edit2, X, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RankingsView({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('JUDGE');
  const [judgeList, setJudgeList] = useState([]);
  const [audienceList, setAudienceList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [editingScoreTeamId, setEditingScoreTeamId] = useState(null);
  const [newScoreValue, setNewScoreValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRankings = async () => {
    try {
      const res = await fetch('/api/results/dashboard');
      const json = await res.json();
      setData(json);
      setJudgeList(json.judgeRankings || []);
      setAudienceList(json.audienceRankings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    // Poll every 5s to keep finalized state in sync
    const interval = setInterval(fetchRankings, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#FCD34D', '#F97316', '#4F46E5', '#10B981']
    });
  };

  const moveRank = (list, index, direction) => {
    const newList = [...list];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    if (activeTab === 'JUDGE') setJudgeList(newList);
    if (activeTab === 'AUDIENCE') setAudienceList(newList);

    setMessage({ type: 'info', text: 'Ranking order changed. Click "Save Ranks" to finalize the change.' });
  };

  const handleSaveReorder = async () => {
    setSubmitting(true);
    const targetList = activeTab === 'JUDGE' ? judgeList : audienceList;
    const orderedTeamIds = targetList.map(t => t.teamId);

    try {
      const res = await fetch('/api/results/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankingType: activeTab,
          orderedTeamIds
        })
      });

      if (!res.ok) throw new Error('Failed to save manual rank order');
      setMessage({ type: 'success', text: `Manual ${activeTab} rankings saved successfully!` });
      fetchRankings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveScore = async (teamId) => {
    if (newScoreValue === '' || isNaN(parseFloat(newScoreValue))) {
      setMessage({ type: 'error', text: 'Please enter a valid numeric score.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/results/edit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankingType: activeTab,
          teamId,
          score: newScoreValue
        })
      });
      if (!res.ok) throw new Error('Failed to update manual score');
      setMessage({ type: 'success', text: `Score successfully updated!` });
      setEditingScoreTeamId(null);
      setNewScoreValue('');
      fetchRankings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeResults = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/results/finalize', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to finalize results');
      setShowFinalizeModal(false);
      triggerConfetti();
      setMessage({ type: 'success', text: '🏆 Results officially locked and published! Rankings are now frozen.' });
      fetchRankings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Compiling Results...</p>
        </div>
      </div>
    );
  }

  const { judgeTies, audienceTies, resultsFinalized } = data || {};
  const currentList = activeTab === 'JUDGE' ? judgeList : audienceList;
  const currentTies = activeTab === 'JUDGE' ? judgeTies : audienceTies;
  const isAdmin = user?.role === 'ADMIN';

  const getRowColor = (rank, isTied) => {
    if (isTied) return 'bg-amber-500/5 hover:bg-amber-500/10';
    if (activeTab === 'AUDIENCE' && rank === 1) return 'bg-amber-500/10 hover:bg-amber-500/20';
    if (activeTab === 'JUDGE') {
      if (rank === 1) return 'bg-amber-500/10 hover:bg-amber-500/20';
      if (rank === 2) return 'bg-slate-400/10 hover:bg-slate-400/20';
      if (rank === 3) return 'bg-orange-700/10 hover:bg-orange-700/20';
      if (rank === 4) return 'bg-indigo-500/10 hover:bg-indigo-500/20';
      if (rank === 5) return 'bg-emerald-500/10 hover:bg-emerald-500/20';
    }
    return 'hover:bg-slate-800/30';
  };

  const getBadgeColor = (rank) => {
    if (rank === 1) return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    if (rank === 2) return 'bg-slate-400/20 text-slate-300 border-slate-400/50';
    if (rank === 3) return 'bg-orange-700/20 text-orange-500 border-orange-700/50';
    if (rank === 4) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50';
    if (rank === 5) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getScoreColor = (rank) => {
    if (activeTab === 'JUDGE' && rank <= 5) {
      if (rank === 1) return 'text-amber-400';
      if (rank === 2) return 'text-slate-300';
      if (rank === 3) return 'text-orange-500';
      if (rank === 4) return 'text-indigo-400';
      if (rank === 5) return 'text-emerald-400';
    } else if (activeTab === 'AUDIENCE' && rank === 1) {
      return 'text-amber-400';
    }
    return 'text-slate-300';
  };

  const unevaluatedJudgeTeams = judgeList.filter(t => t.avgScore === 0).length;
  const unevaluatedAudienceTeams = audienceList.filter(t => t.avgScore === 0).length;
  const hasUnevaluated = unevaluatedJudgeTeams > 0 || unevaluatedAudienceTeams > 0;

  const hasTop5Tie = currentList.slice(0, 5).some(team => currentTies?.some(g => g.score === team.avgScore));

  const filteredList = currentList.filter(team => {
    const q = searchQuery.toLowerCase();
    return (
      team.teamName.toLowerCase().includes(q) ||
      team.teamCode.toLowerCase().includes(q) ||
      team.collegeName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Leaderboard</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Top 5 Cash Prizes and Audience Choice Shield results.
          </p>
        </div>

        {isAdmin && (
          <div>
            {resultsFinalized ? (
              <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                RESULTS FINALIZED
              </div>
            ) : (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="btn-success py-2.5 px-6 gap-2"
              >
                <Trophy className="w-4 h-4" />
                FINALIZE RESULTS
              </button>
            )}
          </div>
        )}
      </div>

      {hasTop5Tie && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 flex items-start gap-3 animate-pulse-subtle">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-400 flex items-center gap-2">
              TIE DETECTED
              <span className="px-1.5 py-0.5 bg-amber-500 text-[#0B1120] font-bold text-[10px] rounded">MANUAL OVERRIDE REQUIRED</span>
            </div>
            <p className="text-xs text-amber-300/80">
              Please inspect the scores and use the arrows to reorder tied teams manually.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          message.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
          'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="surface-card flex flex-col min-h-[50vh] overflow-hidden">
        {/* Tabs & Toolbar */}
        <div className="border-b border-slate-800/60 bg-[#172033]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex px-4 pt-4 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('JUDGE'); setMessage(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap mr-6 ${
                activeTab === 'JUDGE' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <DollarSign className="w-4 h-4" /> Judge Rankings
            </button>
            <button
              onClick={() => { setActiveTab('AUDIENCE'); setMessage(null); }}
              className={`flex items-center gap-2 pb-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                activeTab === 'AUDIENCE' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield className="w-4 h-4" /> Audience Choice
            </button>
          </div>
          
          <div className="p-3 sm:p-0 sm:pr-4 sm:pb-1 border-t border-slate-800/60 sm:border-0 w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3 justify-end">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
              <input 
                type="text" 
                placeholder="Search team or college..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 w-full sm:w-64"
              />
            </div>
            {isAdmin && (
              <button
                onClick={handleSaveReorder}
                disabled={submitting}
                className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Save className="w-3.5 h-3.5" /> Save Ranks
              </button>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#172033] text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-1.5 px-3 text-center font-medium">Rank</th>
                <th className="py-1.5 px-3 font-medium">Team Details</th>
                <th className="py-1.5 px-3 text-center font-medium">{activeTab === 'JUDGE' ? 'Avg Score' : 'Score'}</th>
                <th className="py-1.5 px-3 text-center font-medium">Award</th>
                {isAdmin && <th className="py-1.5 px-3 text-center font-medium">Reorder</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">
                    No teams match your search or no ranking data available.
                  </td>
                </tr>
              ) : (
                filteredList.map((team, idx) => {
                  const rankNum = idx + 1;
                  const isTied = currentTies?.some(g => g.score === team.avgScore);
                  const isWinner = (activeTab === 'JUDGE' && rankNum <= 5) || (activeTab === 'AUDIENCE' && rankNum === 1);

                  return (
                    <tr
                      key={team.teamId}
                      className={`transition-colors ${getRowColor(rankNum, isTied)}`}
                    >
                      <td className="py-1.5 px-3 text-center">
                        <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-extrabold text-sm font-mono shadow ${
                          rankNum === 1 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/50 shadow-amber-400/30' :
                          rankNum === 2 ? 'bg-slate-300 text-slate-900' :
                          rankNum === 3 ? 'bg-orange-600 text-white' :
                          rankNum === 4 && activeTab === 'JUDGE' ? 'bg-indigo-600 text-white' : 
                          rankNum === 5 && activeTab === 'JUDGE' ? 'bg-emerald-600 text-white' : 
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {rankNum}
                        </span>
                      </td>

                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500 font-bold">#{team.teamCode}</span>
                          <span className="font-bold text-white text-base">{team.teamName}</span>
                          {isTied && rankNum <= 5 && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-[#0B1120] font-bold text-[10px] rounded animate-pulse-subtle">
                              TIE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{team.collegeName} &bull; {team.deptName}</div>
                      </td>

                      <td className="py-1.5 px-3 text-center font-mono">
                        {editingScoreTeamId === team.teamId ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              className="w-16 px-2 py-1 text-sm bg-slate-900 border border-amber-500 rounded text-white text-center focus:outline-none"
                              value={newScoreValue}
                              onChange={(e) => setNewScoreValue(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => handleSaveScore(team.teamId)} className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingScoreTeamId(null)} className="p-1 bg-slate-800 rounded text-slate-400 hover:text-slate-200">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 group">
                            <span className={`text-base font-bold ${getScoreColor(rankNum)} ${team.isManualScore ? 'border-b border-dashed' : ''}`}>
                              {team.avgScore}
                            </span>
                            {isTied && rankNum > 5 && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600/60" title="Tied Score" />
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => { setEditingScoreTeamId(team.teamId); setNewScoreValue(team.avgScore.toString()); }}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-all ml-1"
                                title="Override Score"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-1.5 px-3 text-center">
                        {activeTab === 'JUDGE' && rankNum <= 5 ? (
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full inline-flex items-center gap-1 border ${getBadgeColor(rankNum)}`}>
                            <DollarSign className="w-3.5 h-3.5" />
                            CASH PRIZE #{rankNum}
                          </span>
                        ) : activeTab === 'AUDIENCE' && rankNum === 1 ? (
                          <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-[10px] rounded-full inline-flex items-center gap-1 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                            <Shield className="w-3.5 h-3.5" />
                            SHIELD WINNER
                          </span>
                        ) : (
                          <span className="text-slate-600 font-bold">&mdash;</span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-1.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => moveRank(currentList, idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveRank(currentList, idx, 'DOWN')}
                              disabled={idx === currentList.length - 1}
                              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-sm surface-panel p-4 sm:p-8 shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-amber-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Finalize Results?</h3>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              This action will permanently publish the Top 5 Cash Prize winners and the Audience Choice Shield Winner. Ranking order will be locked.
            </p>

            {hasUnevaluated && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex flex-col gap-1 items-start text-left">
                <div className="flex items-center gap-2 mb-1 font-bold text-rose-500">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>WARNING: INCOMPLETE EVALUATIONS</span>
                </div>
                {unevaluatedJudgeTeams > 0 && <span>&bull; {unevaluatedJudgeTeams} teams have no Judge score (0 marks)</span>}
                {unevaluatedAudienceTeams > 0 && <span>&bull; {unevaluatedAudienceTeams} teams have no Audience score (0 marks)</span>}
                <div className="mt-2 text-[10px] text-rose-400/80 uppercase tracking-wide">You can still force-finalize the results.</div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setShowFinalizeModal(false)}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalizeResults}
                disabled={submitting}
                className="btn-primary bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex-1"
              >
                {submitting ? 'Locking...' : 'Confirm & Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
