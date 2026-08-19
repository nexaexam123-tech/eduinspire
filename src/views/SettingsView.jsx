import React, { useState } from 'react';
import { Settings, RotateCcw, Shield, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SettingsView() {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleUnfinalize = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/results/unfinalize', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unfinalize.');
      setMessage({ type: 'success', text: 'Results unfinalised. Rankings are now editable again.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Settings</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">Event administration and system controls.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Results Section */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-[#172033]/50 flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Results Management</h3>
            <p className="text-xs text-slate-400">Control the published state of final results.</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Unfinalize Results</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                If results were finalized by mistake, this will unlock the leaderboard so you can make further manual adjustments before re-finalizing.
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-all whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Unfinalize
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-[#172033]/50 flex items-center gap-3">
          <Database className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white">System Information</h3>
            <p className="text-xs text-slate-400">Platform and event details.</p>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {[
            { label: 'Platform', value: 'EduInspire\'26 Event Management System' },
            { label: 'Database', value: 'SQLite (better-sqlite3)' },
            { label: 'Backend', value: 'Node.js + Express' },
            { label: 'Frontend', value: 'React + Vite + Tailwind CSS' },
            { label: 'Scoring Criteria', value: '8-category framework (100 pts max)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0">
              <span className="text-slate-400 text-xs font-medium">{label}</span>
              <span className="text-slate-200 text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unfinalize confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-sm surface-panel p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-amber-400 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unfinalize Results?</h3>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              This will unlock the leaderboard so manual rank/score edits can be made. The results will no longer show as officially published until you re-finalize.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} disabled={resetting} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleUnfinalize}
                disabled={resetting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-bold transition-all"
              >
                {resetting ? <span className="animate-pulse">Processing...</span> : <><RotateCcw className="w-4 h-4" /> Confirm</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
