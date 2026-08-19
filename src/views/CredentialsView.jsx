import React, { useState, useEffect } from 'react';
import { Key, Copy, Download, Printer, Plus, Search, Filter, Check, UserCheck, Users, Gavel, Mail, ShieldCheck } from 'lucide-react';

export default function CredentialsView() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL', 'PARTICIPANT', 'AUDIENCE', 'JUDGE'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'Used', 'Unused'
  const [copiedId, setCopiedId] = useState(null);
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/credentials');
      const data = await res.json();
      setCredentials(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateAudience = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/credentials/generate-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: genCount })
      });
      if (res.ok) fetchCredentials();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Voter / User ID', 'Email', 'Role', 'Password / Auth Method', 'Team Code', 'Team Name', 'College', 'Status', 'Evaluations Count'];
    const rows = filtered.map(c => [
      c.userId,
      c.email || 'N/A',
      c.role,
      c.role === 'AUDIENCE' ? 'OTP Login (Email)' : c.accessCode,
      c.teamCode,
      `"${c.teamName.replace(/"/g, '""')}"`,
      `"${c.collegeName.replace(/"/g, '""')}"`,
      c.status,
      c.evaluationsCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Event_Credentials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = credentials.filter(c => {
    const matchesSearch =
      c.userId.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.accessCode && c.accessCode.toLowerCase().includes(search.toLowerCase())) ||
      c.teamCode.toLowerCase().includes(search.toLowerCase()) ||
      c.collegeName.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || c.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-indigo-400" />
            <span>Admin Credential Management Center</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage authentication details: Passwords for Faculty Participants & Judges; OTP Login & Voter IDs for Audience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Print Cards</span>
          </button>
        </div>
      </div>

      {/* Generate Extra Audience Codes Widget */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <strong>Generate Extra Audience Voter IDs:</strong> Create additional unique Voter IDs for audience members logging in via OTP.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min="1"
            max="50"
            value={genCount}
            onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono text-center"
          />
          <button
            onClick={handleGenerateAudience}
            disabled={generating}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating...' : 'Generate Voter IDs'}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Voter ID, Email, Team, or College..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles ({credentials.length})</option>
            <option value="PARTICIPANT">Faculty Participants (Password)</option>
            <option value="JUDGE">Judges (Password)</option>
            <option value="AUDIENCE">Audience Voters (OTP)</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Unused">Unused / Active</option>
            <option value="Used">Used / Submitted</option>
          </select>
        </div>
      </div>

      {/* Credentials Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User / Voter ID</th>
                <th className="py-3.5 px-4">Email ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Password / Auth Method</th>
                <th className="py-3.5 px-4">Assigned Team / College</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No matching credentials found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.userId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300 text-sm">
                      {c.userId}
                    </td>

                    <td className="py-3 px-4 text-slate-200">
                      {c.email ? (
                        <span className="font-medium text-slate-200">{c.email}</span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Not registered</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.role === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-300' :
                        c.role === 'JUDGE' ? 'bg-purple-500/20 text-purple-300' :
                        c.role === 'PARTICIPANT' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {c.role === 'PARTICIPANT' ? 'FACULTY' : c.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {c.role === 'AUDIENCE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Mail className="w-3.5 h-3.5" />
                          OTP via Email
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                            {c.accessCode}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {c.teamCode !== 'N/A' ? (
                        <div>
                          <span className="font-bold text-white">#{c.teamCode}</span> &bull; {c.collegeName}
                        </div>
                      ) : (
                        <span className="text-slate-500">General Voter</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Used' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.status} ({c.evaluationsCount} submitted)
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleCopy(
                          c.role === 'AUDIENCE'
                            ? `Voter ID: ${c.userId}${c.email ? ` | Email: ${c.email}` : ''}`
                            : `${c.email || c.userId} / Password: ${c.accessCode}`,
                          c.userId
                        )}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-all"
                        title="Copy Login Details"
                      >
                        {copiedId === c.userId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
