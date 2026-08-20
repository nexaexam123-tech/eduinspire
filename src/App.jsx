import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import AdminDashboard from './views/AdminDashboard';
import TeamManagement from './views/TeamManagement';
import JudgePortal from './views/JudgePortal';
import VoterEvaluationView from './views/VoterEvaluationView';
import RankingsView from './views/RankingsView';
import CredentialsView from './views/CredentialsView';
import UserDetailsView from './views/UserDetailsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('ppt_challenge_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('DEFAULT');
  const [eventState, setEventState] = useState(null);

  // Poll event state for header badges & status sync
  const fetchEventState = async () => {
    try {
      const res = await fetch('/api/event/state');
      const data = await res.json();
      setEventState(data.state);
    } catch (err) {
      console.error('Failed to fetch event state', err);
    }
  };

  useEffect(() => {
    fetchEventState();
    const interval = setInterval(fetchEventState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem('ppt_challenge_user', JSON.stringify(userData));
    if (userData.role === 'ADMIN') {
      setCurrentView('ADMIN_DASHBOARD');
    } else if (userData.role === 'JUDGE') {
      setCurrentView('JUDGE_PORTAL');
    } else {
      setCurrentView('VOTER_EVALUATION');
    }
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('ppt_challenge_user');
    setCurrentView('DEFAULT');
  };

  const renderActiveView = () => {
    if (!user) return <LoginView onLoginSuccess={handleLoginSuccess} />;

    if (user.role === 'ADMIN') {
      switch (currentView) {
        case 'TEAMS_MANAGEMENT': return <TeamManagement />;
        case 'JUDGE_PORTAL': return <JudgePortal />;
        case 'RANKINGS': return <RankingsView user={user} />;
        case 'CREDENTIALS': return <CredentialsView />;
        case 'USER_DETAILS': return <UserDetailsView />;
        case 'SETTINGS': return <SettingsView />;
        case 'ADMIN_DASHBOARD':
        default: return <AdminDashboard onNavigate={(view) => setCurrentView(view)} />;
      }
    }

    if (user.role === 'JUDGE') return <JudgePortal />;
    return <VoterEvaluationView user={user} onLogout={handleLogout} />;
  };

  const isLogin = !user;
  const isAdmin = user?.role === 'ADMIN';
  const isVoter = user?.role === 'PARTICIPANT' || user?.role === 'AUDIENCE';

  if (isLogin) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen text-slate-100 flex font-sans">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header user={user} eventState={eventState} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-7xl mx-auto animate-fade-up">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Judge, Participant, Audience Layout
  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans">
      {!isVoter && (
        <Header user={user} currentView={currentView} setCurrentView={setCurrentView} eventState={eventState} onLogout={handleLogout} />
      )}
      <main className={`flex-1 ${isVoter ? '' : 'p-4 sm:p-8'}`}>
        <div className="max-w-7xl mx-auto animate-fade-up">
          {renderActiveView()}
        </div>
      </main>
      {!isVoter && (
        <footer className="surface-panel border-t border-slate-800/50 py-4 px-4 text-center text-xs text-slate-400 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>&copy; 2026 <strong>EduInspire</strong> &bull; All Rights Reserved.</div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Secure Event Voting System</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
