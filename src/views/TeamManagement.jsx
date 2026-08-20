import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Search, Layers, X, Key, GraduationCap, Building2, UploadCloud, FileSpreadsheet, Play, Download, Mail } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingAll, setSendingAll] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleSendAllCredentials = async () => {
    if (!window.confirm('Are you sure you want to send User ID and Password emails to ALL participants?')) {
      return;
    }
    setSendingAll(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/credentials/send-all-participants', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send credentials.');
      setActionMessage({ type: 'success', text: data.message });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setSendingAll(false);
    }
  };


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

  // Download Sample Excel (.xlsx) Template
  const downloadSampleXLSX = () => {
    const sampleData = [
      {
        "Team Name": "AI-Driven Real-time Adaptive Learning & Micro-Assessment Platform",
        "College Name": "IIT Madras",
        "Department Name": "Computer Science & Engineering",
        "Faculty 1": "Dr. Ramesh Kumar (Lead)",
        "Faculty 1 Email ID": "ramesh.kumar@iitm.ac.in",
        "Faculty 2": "Prof. Anitha Sundaram (Co-Lead)",
        "Faculty 2 Email ID": "anitha.s@iitm.ac.in"
      },
      {
        "Team Name": "Solar Microgrid Optimization using IoT Edge Nodes for Remote Campuses",
        "College Name": "Anna University, Chennai",
        "Department Name": "Electrical & Electronics Engg",
        "Faculty 1": "Dr. Senthil Nathan",
        "Faculty 1 Email ID": "senthil@annauniv.edu",
        "Faculty 2": "Dr. Priya Venkatesh",
        "Faculty 2 Email ID": "priya.v@annauniv.edu"
      },
      {
        "Team Name": "Early Diagnostic Screening of Diabetic Retinopathy via Mobile Vision AI",
        "College Name": "BITS Pilani",
        "Department Name": "Biotechnology & Bio-Engineering",
        "Faculty 1": "Prof. Rajesh Menon",
        "Faculty 1 Email ID": "rajesh.menon@bits-pilani.ac.in",
        "Faculty 2": "Dr. Shalini Gupta",
        "Faculty 2 Email ID": "shalini.g@bits-pilani.ac.in"
      },
      {
        "Team Name": "Blockchain-Verified Decentralized Academic Credential System",
        "College Name": "Delhi Technological University",
        "Department Name": "Information Technology",
        "Faculty 1": "Dr. Amit Sharma",
        "Faculty 1 Email ID": "amit.sharma@dtu.ac.in",
        "Faculty 2": "Prof. Meenakshi Rao",
        "Faculty 2 Email ID": "meenakshi.rao@dtu.ac.in"
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Teams_Template");

    worksheet["!cols"] = [
      { wch: 65 }, // Team Name
      { wch: 32 }, // College Name
      { wch: 32 }, // Department Name
      { wch: 25 }, // Faculty 1
      { wch: 35 }, // Faculty 1 Email ID
      { wch: 25 }, // Faculty 2
      { wch: 35 }  // Faculty 2 Email ID
    ];

    xlsx.writeFile(workbook, "EduInspire_Teams_Sample_Template.xlsx");
  };


  return (
    <div className="space-y-5 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600" />
            <span>Team Management</span>
          </h2>
          <p className="text-slate-700 text-sm font-medium mt-1">
            Manage <strong className="text-slate-950 font-bold">{teams.length} participating colleges</strong> and faculty access credentials.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSendAllCredentials}
            disabled={sendingAll}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            title="Email User IDs & Passwords to all registered participants"
          >
            <Mail className={`w-4 h-4 ${sendingAll ? 'animate-spin' : ''}`} />
            <span>{sendingAll ? 'Sending Emails...' : 'Send Passwords to All Participants'}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary font-bold shadow-md"
          >
            <Plus className="w-4 h-4" /> Add New Team
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm font-bold border animate-fade-up shadow-sm ${
          actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          {actionMessage.text}
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Bulk Upload Widget */}
        <div className="lg:col-span-1 bg-white border border-slate-300 shadow-sm rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Bulk Upload Teams
              </h3>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-3">
              Upload an Excel (.xlsx) or CSV file with columns: <strong className="text-slate-900">Team Name, College Name, Department Name, Faculty 1, Faculty 2</strong>.
            </p>

            <div 
              className="border-2 border-dashed border-slate-400 rounded-xl bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-500 flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer shadow-inner"
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
                  <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-950">{uploadFile.name}</p>
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">File selected & ready</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-12 h-12 text-indigo-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-950">Drag & drop Excel or CSV</p>
                  <p className="text-xs font-semibold text-slate-600">or click to browse (.xlsx, .csv)</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            {uploadFile ? (
              <div className="flex gap-2">
                <button onClick={() => setUploadFile(null)} className="btn-secondary flex-1 text-xs py-2.5 font-bold text-slate-800 border-slate-300">
                  Clear
                </button>
                <button onClick={handleBulkUpload} disabled={uploading} className="btn-success flex-1 text-xs py-2.5 font-bold shadow-sm">
                  {uploading ? 'Uploading...' : 'Process File'}
                </button>
              </div>
            ) : (
              <button
                onClick={downloadSampleXLSX}
                className="w-full bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-950 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                title="Download formatted sample Excel sheet"
              >
                <Download className="w-4 h-4 text-indigo-700" />
                <span>Download Sample Excel Template (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Teams List */}
        <div className="lg:col-span-2 bg-white border border-slate-300 shadow-sm rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by team code, college, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-950 placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>
            <div className="text-xs font-bold text-slate-700 hidden sm:block">
              Showing <span className="text-slate-950 font-extrabold">{filteredTeams.length}</span> of {teams.length} teams
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[620px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-900 text-xs font-extrabold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
                <tr>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Team & Project Details</th>
                  <th className="py-3.5 px-4">Faculty Members</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-950">
                      <span className="inline-block px-2.5 py-1 bg-indigo-100 border border-indigo-300 text-indigo-950 rounded-lg text-xs font-bold">
                        #{team.presentation_order}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-200 border border-slate-400 text-slate-950 font-mono font-bold text-xs rounded">
                          {team.team_code}
                        </span>
                        <span className="font-extrabold text-slate-950 text-sm leading-snug">
                          {team.team_name}
                        </span>
                      </div>
                      <div className="text-xs flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-slate-700">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" /> {team.college_name}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-slate-600">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-500" /> {team.dept_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-950 font-bold">{team.faculty_1}</div>
                      {team.faculty_2 && (
                        <div className="text-slate-600 font-semibold mt-0.5">{team.faculty_2}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
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
                          className="p-2 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                          title="Set on Live Stage & Start Voting"
                        >
                          <Play className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button 
                          onClick={() => handleOpenView(team)} 
                          className="p-2 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors" 
                          title="View Credentials"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(team)} 
                          className="p-2 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors" 
                          title="Edit Team"
                        >
                          <Edit2 className="w-4 h-4 text-amber-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(team.id)} 
                          className="p-2 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors" 
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-600 font-bold text-sm">
                      No matching teams found.
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl p-6 shadow-2xl relative text-slate-900 animate-fade-up">
            <button onClick={() => setShowViewModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-5 pb-3 border-b border-slate-200">
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-100 border border-indigo-300 text-indigo-950 rounded mb-2 inline-block">
                {teamDetails.team_code} (Order #{teamDetails.presentation_order})
              </span>
              <h3 className="text-lg font-extrabold text-slate-950 leading-snug">{teamDetails.team_name}</h3>
              <p className="text-xs font-bold text-slate-700 mt-1">{teamDetails.college_name} - {teamDetails.dept_name}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" /> Faculty Login Credentials
              </h4>

              <div className="space-y-3">
                {teamDetails.participants?.map((p, idx) => (
                  <div key={p.user_id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-300">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-700">Faculty {idx + 1} User ID</span>
                      <span className="font-mono font-bold text-sm text-slate-950">{p.user_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Password / Access Code</span>
                      <span className="font-mono font-extrabold text-indigo-950 tracking-wider bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 rounded text-sm">{p.access_code}</span>
                    </div>
                  </div>
                ))}
                {(!teamDetails.participants || teamDetails.participants.length === 0) && (
                  <p className="text-xs text-slate-500 italic">No faculty credentials assigned yet.</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button onClick={() => setShowViewModal(false)} className="btn-secondary w-full font-bold text-slate-900 border-slate-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-slate-900 animate-fade-up">
            <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-extrabold text-slate-950 mb-6 pb-2 border-b border-slate-200">
              {showAddModal ? 'Add New Team' : `Edit Team: ${selectedTeam?.team_code}`}
            </h3>

            <form onSubmit={showAddModal ? handleSaveAdd : handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Presentation / Project Title</label>
                <input
                  type="text" required
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">College Name</label>
                <input
                  type="text" required
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Department Name</label>
                <input
                  type="text" required
                  value={formData.deptName}
                  onChange={(e) => setFormData({ ...formData, deptName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Faculty 1</label>
                  <input
                    type="text" required
                    value={formData.faculty1}
                    onChange={(e) => setFormData({ ...formData, faculty1: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Faculty 2</label>
                  <input
                    type="text" required
                    value={formData.faculty2}
                    onChange={(e) => setFormData({ ...formData, faculty2: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Presentation Order</label>
                <input
                  type="number" required min="1" max="100"
                  value={formData.presentationOrder}
                  onChange={(e) => setFormData({ ...formData, presentationOrder: parseInt(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-300 rounded-xl text-slate-950 font-semibold focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="btn-secondary px-6 font-bold text-slate-800 border-slate-300">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-8 font-bold shadow-md">
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

