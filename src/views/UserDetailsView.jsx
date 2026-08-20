import React, { useState, useEffect, useRef } from 'react';
import { Users, Gavel, UserCheck, Key, UploadCloud, Check, X, Mail, Edit2, Trash2, AlertTriangle, Shuffle, Trophy, Download } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function UserDetailsView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('JUDGE');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [editingEmailUserId, setEditingEmailUserId] = useState(null);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState(null);

  // Delete state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  // Tie Breaker state
  const [tbTeam1, setTbTeam1] = useState('');
  const [tbTeam2, setTbTeam2] = useState('');
  const [tbWinner, setTbWinner] = useState(null);
  const [tbSpinning, setTbSpinning] = useState(false);
  const [tbDisplay, setTbDisplay] = useState('');

  const fileInputRef = useRef(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = activeTab === 'AUDIENCE' ? '/api/credentials/upload-audience' : '/api/credentials/upload-participants';
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadMessage({ type: 'success', text: `Successfully imported ${data.imported} ${activeTab.toLowerCase()}s. Skipped ${data.skipped} duplicates.` });
      fetchUsers();
    } catch (err) {
      setUploadMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const startEditEmail = (user) => {
    setEditingEmailUserId(user.user_id);
    setEmailInputValue(user.email || '');
    setEmailMessage(null);
  };

  const cancelEditEmail = () => {
    setEditingEmailUserId(null);
    setEmailInputValue('');
  };

  const handleSaveEmail = async (userId) => {
    if (!emailInputValue.trim() || !emailInputValue.includes('@')) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setSavingEmail(true);
    setEmailMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInputValue.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update email.');
      setEmailMessage({ type: 'success', text: `Email updated for ${userId}.` });
      setEditingEmailUserId(null);
      setEmailInputValue('');
      fetchUsers();
    } catch (err) {
      setEmailMessage({ type: 'error', text: err.message });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeleting(true);
    setDeleteMessage(null);
    try {
      const res = await fetch(`/api/users/${deleteConfirmUser.user_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');
      setDeleteMessage({ type: 'success', text: data.message });
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (err) {
      setDeleteMessage({ type: 'error', text: err.message });
      setDeleteConfirmUser(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => u.role === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Users...</p>
        </div>
      </div>
    );
  }

  const handleTieBreaker = () => {
    if (!tbTeam1.trim() || !tbTeam2.trim()) return;
    setTbWinner(null);
    setTbSpinning(true);
    setTbDisplay('');
    const teams = [tbTeam1.trim(), tbTeam2.trim()];
    let count = 0;
    const total = 30;
    const interval = setInterval(() => {
      setTbDisplay(teams[count % 2]);
      count++;
      if (count >= total) {
        clearInterval(interval);
        const winner = teams[Math.floor(Math.random() * 2)];
        setTbDisplay(winner);
        setTbWinner(winner);
        setTbSpinning(false);
      }
    }, 80);
  };

  const downloadSampleXLSX = () => {
    const isAudience = activeTab === 'AUDIENCE';
    let sampleData, sheetName, fileName;
    if (isAudience) {
      sampleData = [
        { "Email": "student01@college.edu", "Name": "Riya Sharma" },
        { "Email": "student02@college.edu", "Name": "Arjun Mehta" },
        { "Email": "student03@college.edu", "Name": "Priya Nair" },
        { "Email": "student04@college.edu", "Name": "Karthik Rajan" },
      ];
      sheetName = 'Audience_Template';
      fileName = 'EduInspire_Audience_Sample_Template.xlsx';
    } else {
      sampleData = [
        { "Team Code": "TM001", "Faculty Name": "Dr. Ramesh Kumar", "Email": "ramesh@iitm.ac.in" },
        { "Team Code": "TM001", "Faculty Name": "Prof. Anitha Sundaram", "Email": "anitha@iitm.ac.in" },
        { "Team Code": "TM002", "Faculty Name": "Dr. Senthil Nathan", "Email": "senthil@annauniv.edu" },
        { "Team Code": "TM002", "Faculty Name": "Dr. Priya Venkatesh", "Email": "priya@annauniv.edu" },
      ];
      sheetName = 'Participants_Template';
      fileName = 'EduInspire_Participants_Sample_Template.xlsx';
    }
    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    worksheet['!cols'] = isAudience
      ? [{ wch: 35 }, { wch: 25 }]
      : [{ wch: 12 }, { wch: 30 }, { wch: 35 }];
    xlsx.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            <span>User Management</span>
          </h2>
          <p className="text-slate-700 font-medium text-sm mt-1">
            Manage authentication and details for Judges, Participants, and Audience.
          </p>
        </div>
      </div>

      {/* Status messages */}
      {uploadMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          uploadMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {uploadMessage.text}
        </div>
      )}
      {emailMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          emailMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {emailMessage.text}
        </div>
      )}
      {deleteMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium border animate-fade-up ${
          deleteMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {deleteMessage.text}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[50vh]">
        {/* Tabs */}
        <div className="border-b border-slate-200 px-4 pt-4 flex gap-4 overflow-x-auto bg-slate-50">
          {[
            { id: 'JUDGE', label: 'Judges', icon: Gavel },
            { id: 'PARTICIPANT', label: 'Participants', icon: UserCheck },
            { id: 'AUDIENCE', label: 'Audience', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setEditingEmailUserId(null); setEmailMessage(null); setDeleteMessage(null); }}
                className={`flex items-center gap-2 pb-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <p className="text-sm text-slate-600 font-semibold">
            Showing <span className="text-slate-950 font-extrabold">{filteredUsers.length}</span> {activeTab.toLowerCase()} accounts
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.location.href = '/api/users/export'} 
              className="btn-secondary py-2 text-xs flex items-center gap-1 text-slate-800 border-slate-300"
            >
              <Users className="w-4 h-4" /> Export Users
            </button>
            {(activeTab === 'PARTICIPANT' || activeTab === 'AUDIENCE') && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button
                  onClick={downloadSampleXLSX}
                  className="py-2 text-xs flex items-center gap-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-900 font-bold rounded-xl transition-all"
                  title="Download sample Excel template"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                  Sample .xlsx
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary py-2 text-xs flex items-center gap-1 text-slate-900 font-bold border-slate-300">
                  {uploading ? <span className="animate-pulse">Uploading...</span> : <><UploadCloud className="w-4 h-4" /> Upload {activeTab === 'AUDIENCE' ? 'Audience' : 'Participants'}</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-800 text-xs uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 font-extrabold">Email / Contact</th>
                <th className="py-2.5 px-3 font-extrabold">{activeTab === 'AUDIENCE' ? 'Voter ID' : 'User ID'}</th>
                {(activeTab === 'PARTICIPANT' || activeTab === 'JUDGE') && <th className="py-2.5 px-3 font-extrabold">Password</th>}
                <th className="py-2.5 px-3 font-extrabold">Role</th>
                <th className="py-2.5 px-3 text-center font-extrabold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={(activeTab === 'PARTICIPANT' || activeTab === 'JUDGE') ? 5 : 4} className="py-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                      <Users className="w-8 h-8 opacity-20" />
                      <p className="text-sm">No users found in this category.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-indigo-50/40 transition-colors group">
                    {/* Email column with inline edit */}
                    <td className="py-2 px-3 text-slate-800">
                      {editingEmailUserId === user.user_id ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <input
                            type="email"
                            value={emailInputValue}
                            onChange={(e) => setEmailInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEmail(user.user_id);
                              if (e.key === 'Escape') cancelEditEmail();
                            }}
                            className="w-48 px-2 py-1 text-xs bg-slate-900 border border-indigo-500 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Enter email..."
                            autoFocus
                          />
                          <button onClick={() => handleSaveEmail(user.user_id)} disabled={savingEmail} className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500 transition-colors" title="Save Email">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEditEmail} className="p-1 bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user.email ? (
                            <span className="font-semibold text-slate-900">{user.email}</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not provided</span>
                          )}
                          <button
                            onClick={() => startEditEmail(user)}
                            className="p-1 text-slate-600 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Email"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-3">
                      <span className="font-mono text-xs text-indigo-700 font-bold">{user.user_id}</span>
                    </td>

                    {/* Password col — for Participants and Judges */}
                    {(activeTab === 'PARTICIPANT' || activeTab === 'JUDGE') && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-900 font-bold tracking-wider">
                            {user.access_code}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                        user.role === 'JUDGE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        user.role === 'PARTICIPANT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Delete action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => { setDeleteConfirmUser(user); setDeleteMessage(null); }}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tie Breaker Section ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Shuffle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">Tie Breaker</h3>
            <p className="text-xs text-slate-500 font-medium">Enter two team names and let randomness decide the winner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Team 1</label>
            <input
              type="text"
              placeholder="e.g. Team Alpha / IIT Madras"
              value={tbTeam1}
              onChange={(e) => { setTbTeam1(e.target.value); setTbWinner(null); setTbDisplay(''); }}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold text-sm focus:border-indigo-600 focus:outline-none shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Team 2</label>
            <input
              type="text"
              placeholder="e.g. Team Beta / Anna University"
              value={tbTeam2}
              onChange={(e) => { setTbTeam2(e.target.value); setTbWinner(null); setTbDisplay(''); }}
              className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold text-sm focus:border-indigo-600 focus:outline-none shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleTieBreaker}
            disabled={tbSpinning || !tbTeam1.trim() || !tbTeam2.trim()}
            className="btn-primary px-8 py-3 text-base font-extrabold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Shuffle className={`w-5 h-5 ${tbSpinning ? 'animate-spin' : ''}`} />
            {tbSpinning ? 'Picking...' : 'Pick Random Winner'}
          </button>

          {(tbSpinning || tbWinner) && (
            <div className={`w-full max-w-md rounded-2xl border-2 p-6 text-center transition-all ${
              tbWinner
                ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400 shadow-lg shadow-indigo-100'
                : 'bg-slate-50 border-slate-300'
            }`}>
              {tbWinner ? (
                <>
                  <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">🎉 Winner!</p>
                  <p className="text-2xl font-extrabold text-slate-950">{tbWinner}</p>
                  <p className="text-xs text-slate-500 mt-2">Selected by random draw</p>
                  <button
                    onClick={() => { setTbWinner(null); setTbDisplay(''); setTbTeam1(''); setTbTeam2(''); }}
                    className="mt-4 text-xs text-indigo-600 hover:underline font-semibold"
                  >Reset</button>
                </>
              ) : (
                <>
                  <Shuffle className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
                  <p className="text-xl font-extrabold text-indigo-700">{tbDisplay || '...'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-sm surface-panel p-6 shadow-2xl relative text-center">
            {/* Icon */}
            <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Delete User?</h3>
            <p className="text-sm text-slate-400 mb-1">
              You are about to permanently delete:
            </p>
            <div className="mb-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-left space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">User ID</span>
                <span className="font-mono font-bold text-indigo-400">{deleteConfirmUser.user_id}</span>
              </div>
              {deleteConfirmUser.email && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="text-slate-200">{deleteConfirmUser.email}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Role</span>
                <span className={`font-bold ${
                  deleteConfirmUser.role === 'JUDGE' ? 'text-amber-400' :
                  deleteConfirmUser.role === 'PARTICIPANT' ? 'text-indigo-400' :
                  'text-emerald-400'
                }`}>{deleteConfirmUser.role}</span>
              </div>
            </div>

            {deleteConfirmUser.role === 'PARTICIPANT' && (
              <p className="text-[11px] text-rose-400/80 mb-4 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                ⚠️ If this is the last participant on their team, the team and all its scores will also be removed.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                {deleting ? (
                  <span className="animate-pulse">Deleting...</span>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
