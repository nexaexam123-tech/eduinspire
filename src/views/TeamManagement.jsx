import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Search, Layers, X, Key, GraduationCap, Building2, UploadCloud, FileSpreadsheet, Play } from 'lucide-react';

export default function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);

  // Form inputs
  const [formData, setFormData] = useState({
    teamName: '',
    collegeName: '',
    deptName: '',
    faculty1: '',
    faculty2: '',
    presentationOrder: ''
  });

  // Bulk Upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      teamName: '',
      collegeName: '',
      deptName: '',
      faculty1: '',
      faculty2: '',
      presentationOrder: teams.length + 1
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (team) => {
    setSelectedTeam(team);
    setFormData({
      teamName: team.team_name,
      collegeName: team.college_name,
      deptName: team.dept_name,
      faculty1: team.faculty_1,
      faculty2: team.faculty_2,
      presentationOrder: team.presentation_order
    });
    setShowEditModal(true);
  };

  const handleOpenView = async (team) => {
    setSelectedTeam(team);
    try {
      const res = await fetch(`/api/teams/${team.id}`);
      const data = await res.json();
      setTeamDetails(data);
      setShowViewModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchTeams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchTeams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (res.ok) fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTeams = teams.filter(t =>
    t.team_name.toLowerCase().includes(search.toLowerCase()) ||
    t.college_name.toLowerCase().includes(search.toLowerCase()) ||
    t.dept_name.toLowerCase().includes(search.toLowerCase()) ||
    t.team_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const data = new FormData();
    data.append('file', uploadFile);

    try {
      const res = await fetch('/api/teams/bulk-upload', {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        setUploadFile(null);
        fetchTeams();
        alert('Bulk upload successful!');
      } else {
        const errorData = await res.json();
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Team Management</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage {teams.length} participating colleges and faculty access codes.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add New Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Bulk Upload Widget */}
        <div className="lg:col-span-1 surface-card p-4 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4">Bulk Upload Teams</h3>
          <div 
            className="flex-1 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-800/20 flex flex-col items-center justify-center p-4 text-center hover:bg-slate-800/40 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv, .xlsx" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
            />
            {uploadFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-medium text-emerald-300">{uploadFile.name}</p>
                <p className="text-xs text-slate-400">Ready to upload</p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Drag & drop Excel or CSV</p>
                <p className="text-xs text-slate-500">or click to browse files</p>
              </div>
            )}
          </div>
          
          {uploadFile && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setUploadFile(null)} className="btn-secondary flex-1 text-xs py-2">
                Clear
              </button>
              <button onClick={handleBulkUpload} disabled={uploading} className="btn-success flex-1 text-xs py-2">
                {uploading ? 'Uploading...' : 'Process File'}
              </button>
            </div>
          )}
        </div>

        {/* Teams List */}
        <div className="lg:col-span-2 surface-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by team code, college, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#172033] border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-medium">Order</th>
                  <th className="py-3 px-4 font-medium">Team Details</th>
                  <th className="py-3 px-4 font-medium">Faculty</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-400 font-bold">
                      #{team.presentation_order}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] rounded">
                          {team.team_code}
                        </span>
                        <span className="font-semibold text-slate-100">{team.team_name}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {team.college_name}</span>
                        <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {team.dept_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="text-slate-300 font-medium">{team.faculty_1}</div>
                      {team.faculty_2 && <div className="text-slate-500">{team.faculty_2}</div>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Set Team #${team.presentation_order} (${team.team_code}) on stage and start voting?`)) {
                              await fetch('/api/event/presentation/select', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ teamId: team.id })
                              });
                              await fetch('/api/event/voting/global-update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'START', durationSeconds: 1200 })
                              });
                              alert(`Team #${team.presentation_order} is now on live stage and voting is open!`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="Set on Live Stage & Start Voting"
                        >
                          <Play className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button onClick={() => handleOpenView(team)} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors" title="View Credentials">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenEdit(team)} className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors" title="Edit Team">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(team.id)} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors" title="Delete Team">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 text-sm">
                      No teams found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Team Credentials Modal */}
      {showViewModal && selectedTeam && teamDetails && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-md surface-panel p-4 shadow-2xl relative">
            <button onClick={() => setShowViewModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <span className="text-xs font-mono font-bold text-indigo-400 mb-1 block">{teamDetails.team_code}</span>
              <h3 className="text-xl font-bold text-white leading-tight">{teamDetails.team_name}</h3>
              <p className="text-sm text-slate-400 mt-1">{teamDetails.college_name}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Key className="w-4 h-4 text-indigo-400" /> Faculty Credentials
              </h4>

              <div className="space-y-3">
                {teamDetails.participants?.map((p, idx) => (
                  <div key={p.user_id} className="p-4 bg-[#172033] rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-400">Faculty {idx + 1} ID</span>
                      <span className="font-mono text-sm text-white">{p.user_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-400">Access Code</span>
                      <span className="font-mono font-bold text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">{p.access_code}</span>
                    </div>
                  </div>
                ))}
                {(!teamDetails.participants || teamDetails.participants.length === 0) && (
                  <p className="text-xs text-slate-500 italic">No faculty credentials assigned yet.</p>
                )}
              </div>
            </div>

            <div className="mt-8">
              <button onClick={() => setShowViewModal(false)} className="btn-secondary w-full">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-lg surface-panel p-4 sm:p-8 shadow-2xl relative">
            <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">
              {showAddModal ? 'Add New Team' : `Edit Team: ${selectedTeam?.team_code}`}
            </h3>

            <form onSubmit={showAddModal ? handleSaveAdd : handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Presentation / Project Title</label>
                <input
                  type="text" required
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-300 mb-1.5">College Name</label>
                <input
                  type="text" required
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Department Name</label>
                <input
                  type="text" required
                  value={formData.deptName}
                  onChange={(e) => setFormData({ ...formData, deptName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Faculty 1</label>
                  <input
                    type="text" required
                    value={formData.faculty1}
                    onChange={(e) => setFormData({ ...formData, faculty1: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Faculty 2</label>
                  <input
                    type="text" required
                    value={formData.faculty2}
                    onChange={(e) => setFormData({ ...formData, faculty2: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Presentation Order</label>
                <input
                  type="number" required min="1" max="100"
                  value={formData.presentationOrder}
                  onChange={(e) => setFormData({ ...formData, presentationOrder: parseInt(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="btn-secondary px-6">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-8">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
