import React, { useState, useEffect, useRef } from 'react';
import { Users, Gavel, UserCheck, Key, UploadCloud, Check, X, Mail, Edit2, Trash2, AlertTriangle } from 'lucide-react';

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
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null); // user object to confirm deletion
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

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

  return (
    <div className="space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>User Management</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
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

      <div className="overflow-hidden flex flex-col min-h-[50vh]">
        {/* Tabs */}
        <div className="border-b border-slate-700/40 px-4 pt-4 flex gap-4 overflow-x-auto">
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
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-700/40 flex items-center justify-between">
          <p className="text-sm text-slate-400 font-medium">
            Showing <span className="text-white">{filteredUsers.length}</span> {activeTab.toLowerCase()} accounts
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.location.href = '/api/users/export'} 
              className="btn-secondary py-2 text-xs flex items-center gap-1"
            >
              <Users className="w-4 h-4" /> Export Users
            </button>
            {(activeTab === 'PARTICIPANT' || activeTab === 'AUDIENCE') && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary py-2 text-xs flex items-center gap-1">
                  {uploading ? <span className="animate-pulse">Uploading...</span> : <><UploadCloud className="w-4 h-4" /> Upload {activeTab === 'AUDIENCE' ? 'Audience' : 'Participants'}</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#172033] text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-1.5 px-3 font-medium">Email / Contact</th>
                <th className="py-1.5 px-3 font-medium">{activeTab === 'AUDIENCE' ? 'Voter ID' : 'User ID'}</th>
                {(activeTab === 'PARTICIPANT' || activeTab === 'JUDGE') && <th className="py-1.5 px-3 font-medium">Password</th>}
                <th className="py-1.5 px-3 font-medium">Role</th>
                <th className="py-1.5 px-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
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
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Email column with inline edit */}
                    <td className="py-2 px-3 text-slate-200">
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
                            <span className="font-medium text-slate-200">{user.email}</span>
                          ) : (
                            <span className="text-slate-500 italic text-xs">Not provided</span>
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
                      <span className="font-mono text-xs text-indigo-400 font-bold">{user.user_id}</span>
                    </td>

                    {/* Password col — for Participants and Judges */}
                    {(activeTab === 'PARTICIPANT' || activeTab === 'JUDGE') && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 tracking-wider">
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
