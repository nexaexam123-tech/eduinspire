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
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Settings</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium">Event administration and system controls.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold border animate-fade-up shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950">Results Management</h3>
            <p className="text-xs text-slate-500 font-medium">Control the published state of final results.</p>
          </div>
        </div>
        <div className="p-5 space-y-4 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-950">Unfinalize Results</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                If results were finalized by mistake, this will unlock the leaderboard so you can make further manual adjustments before re-finalizing.
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 hover:bg-amber-200 text-xs font-extrabold transition-all shadow-sm shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              Unfinalize
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950">System Information</h3>
            <p className="text-xs text-slate-500 font-medium">Platform and event details.</p>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm bg-white">
          {[
            { label: 'Platform', value: 'EduInspire\'26 Event Management System' },
            { label: 'Database', value: 'SQLite (better-sqlite3)' },
            { label: 'Backend', value: 'Node.js + Express' },
            { label: 'Frontend', value: 'React + Vite + Tailwind CSS' },
            { label: 'Scoring Criteria', value: '8-category framework (100 pts max)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 text-xs font-bold">{label}</span>
              <span className="text-slate-950 text-xs font-extrabold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unfinalize confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-amber-100 border border-amber-300 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-950 mb-2">Unfinalize Results?</h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed font-medium">
              This will unlock the leaderboard so manual rank/score edits can be made. The results will no longer show as officially published until you re-finalize.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUnfinalize}
                disabled={resetting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md transition-all"
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

