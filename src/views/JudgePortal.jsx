import React, { useState, useEffect } from 'react';
import { Gavel, CheckCircle2, Save, Sparkles, AlertCircle, Award } from 'lucide-react';
import SliderScore, { getCriteriaList } from '../components/SliderScore';

export default function JudgePortal() {
  const [teams, setTeams] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState('Judge 1');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [existingScores, setExistingScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [scores, setScores] = useState({
    studentImpact: 14,
    facultyImpact: 7,
    adminImpact: 7,
    socialImpact: 7,
    innovation: 14,
    implementation: 10,
    outcomes: 7,
    replicability: 4
  });

  const criteriaList = getCriteriaList();

  const fetchData = async () => {
    try {
      const [teamsRes, scoresRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/judge/scores')
      ]);

      const teamsData = await teamsRes.json();
      const scoresData = await scoresRes.json();

      setTeams(teamsData);
      setExistingScores(scoresData);

      if (teamsData.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsData[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedTeamId || !selectedJudge) return;

    const matched = existingScores.find(
      s => s.judge_id === selectedJudge && s.team_id === parseInt(selectedTeamId)
    );

    if (matched) {
      setScores({
        studentImpact: matched.student_impact,
        facultyImpact: matched.faculty_impact,
        adminImpact: matched.admin_impact,
        socialImpact: matched.social_impact,
        innovation: matched.innovation,
        implementation: matched.implementation,
        outcomes: matched.outcomes,
        replicability: matched.replicability
      });
    } else {
      setScores({
        studentImpact: 14,
        facultyImpact: 7,
        adminImpact: 7,
        socialImpact: 7,
        innovation: 14,
        implementation: 10,
        outcomes: 7,
        replicability: 4
      });
    }
  }, [selectedJudge, selectedTeamId, existingScores]);

  const handleScoreChange = (key, value) => {
    setScores(prev => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/judge/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId: selectedJudge,
          teamId: parseInt(selectedTeamId),
          ...scores
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit score');

      setMessage({ type: 'success', text: `Paper scores for ${selectedJudge} saved successfully! Total: ${totalScore} / 100` });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const currentTeamObj = teams.find(t => t.id === parseInt(selectedTeamId));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Evaluation Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gavel className="w-6 h-6 text-indigo-400" />
            <span>Judge Score Entry</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Digitize official paper scores for each competing team using the 8-category framework.
          </p>
        </div>
      </div>

      <div className="surface-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest">Select Judge Identity</label>
          <div className="flex gap-2">
            {['Judge 1', 'Judge 2'].map(j => (
              <button
                key={j}
                onClick={() => setSelectedJudge(j)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
                  selectedJudge === j 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                    : 'bg-[#172033] border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest">Select Team to Score</label>
          <div className="relative">
            <select
              className="form-input appearance-none"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="" disabled>Select a team...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>#{t.presentation_order} - {t.team_name} ({t.team_code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {message.text}
        </div>
      )}

      {selectedTeamId && currentTeamObj && (
        <form onSubmit={handleSubmit} className="surface-card p-4 space-y-8 animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold tracking-wider">#{currentTeamObj.team_code}</span>
                <span className="text-xl font-bold text-white leading-tight">{currentTeamObj.team_name}</span>
              </div>
              <div className="text-sm text-slate-400">{currentTeamObj.college_name}</div>
            </div>
            
            <div className="bg-[#172033] border border-slate-700 p-3 rounded-xl flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Score</div>
                <div className="text-3xl font-black font-mono text-indigo-400">{totalScore}</div>
              </div>
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
              Evaluation Criteria
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {criteriaList.map((crit) => (
                <SliderScore
                  key={crit.key}
                  categoryKey={crit.key}
                  title={crit.title}
                  max={crit.max}
                  description={crit.description}
                  value={scores[crit.key]}
                  onChange={handleScoreChange}
                />
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/60 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary py-3 px-10 text-base"
            >
              <Save className="w-5 h-5" />
              {submitting ? 'Saving...' : 'Save Paper Scores'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
