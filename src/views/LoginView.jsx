import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Users, Gavel, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, ChevronLeft } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  // viewState can be: 'HOME', 'PARTICIPANT_LOGIN', 'AUDIENCE_LOGIN', 'ADMIN_LOGIN', 'JUDGE_LOGIN', 'ADMIN_REGISTER'
  const [viewState, setViewState] = useState('HOME');
  
  const [userId, setUserId] = useState(''); 
  const [password, setPassword] = useState('');
  
  const [audienceEmail, setAudienceEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showPassword, setShowPassword] = useState(false);

  const navigateTo = (state) => {
    setViewState(state);
    setError(null);
    setOtpSent(false);
    
    if (state === 'ADMIN_LOGIN') {
      setUserId('admin');
      setPassword('admin123');
    } else {
      setUserId('');
      setPassword('');
    }
    
    setAudienceEmail('');
    setOtp('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accessCode: password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userId, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed.');
      }

      alert('Admin account created successfully! You can now log in.');
      navigateTo('ADMIN_LOGIN');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: audienceEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: audienceEmail, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const RoleCard = ({ icon: Icon, title, desc, onClick }) => (
    <button 
      onClick={onClick}
      className="group w-full text-left p-5 bg-[#E5E4E2] border border-[#C9C9C9] rounded-xl hover:bg-[#F1F0EE] transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#111315]/10 flex items-center justify-center text-[#111315] group-hover:bg-[#111315]/15 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-[#111315] text-[15px] uppercase tracking-wide">{title}</h4>
          <p className="text-[12px] text-[#55585C] mt-0.5">{desc}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-[#55585C] group-hover:text-[#111315] group-hover:translate-x-1 transition-all" />
    </button>
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fade-up">
      <div className="w-full max-w-lg surface-panel p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5">
        
        {/* Branding */}
        <div className="text-center space-y-2 mb-10 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-slate-300 text-[10px] font-bold tracking-wider mb-2 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Event Evaluation Platform</span>
          </div>
          <h1 className="text-4xl font-extrabold text-[#F5F5F5] tracking-tight">
            eduinspire
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-start gap-2 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative z-10">
          {viewState === 'HOME' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <span className="text-xs font-bold text-[#55585C] uppercase tracking-widest">Select Your Portal</span>
              </div>
              <RoleCard 
                icon={ShieldCheck} 
                title="Admin" 
                desc="System Administration" 
                onClick={() => navigateTo('ADMIN_LOGIN')}
              />
              <RoleCard 
                icon={Gavel} 
                title="Judge" 
                desc="Evaluation Panel" 
                onClick={() => navigateTo('JUDGE_LOGIN')}
              />
              <RoleCard 
                icon={UserCheck} 
                title="Faculty Participant" 
                desc="Faculty Team Participant" 
                onClick={() => navigateTo('PARTICIPANT_LOGIN')}
              />
              <RoleCard 
                icon={Users} 
                title="Audience" 
                desc="Audience Evaluation" 
                onClick={() => navigateTo('AUDIENCE_LOGIN')}
              />
            </div>
          )}

          {['PARTICIPANT_LOGIN', 'ADMIN_LOGIN', 'JUDGE_LOGIN'].includes(viewState) && (
            <div className="space-y-5 animate-fade-up">
              <button onClick={() => navigateTo('HOME')} className="text-[13px] text-slate-400 hover:text-white flex items-center gap-1 mb-2 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to roles
              </button>
              
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">
                  {viewState === 'ADMIN_LOGIN' ? 'Admin Login' : viewState === 'JUDGE_LOGIN' ? 'Judge Login' : 'Participant Login'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Please enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-slate-300 mb-1.5">
                    {viewState === 'ADMIN_LOGIN' ? 'Admin Username' : 'Email or User ID'}
                  </label>
                  <input
                    type="text" required
                    placeholder={viewState === 'ADMIN_LOGIN' ? 'Enter admin username' : 'Enter your Email or User ID (e.g. P001)'}
                    value={userId} onChange={e => setUserId(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} required placeholder="Enter Password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="form-input pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
                
                {viewState === 'ADMIN_LOGIN' && (
                  <div className="text-center pt-4 border-t border-[#C9C9C9] mt-6">
                    <p className="text-[13px] font-bold text-[#55585C]">
                      Default Admin Credentials Auto-Filled
                    </p>
                  </div>
                )}
              </form>
            </div>
          )}

          {viewState === 'AUDIENCE_LOGIN' && (
            <div className="space-y-5 animate-fade-up">
              <button onClick={() => navigateTo('HOME')} className="text-[13px] text-slate-400 hover:text-white flex items-center gap-1 mb-2 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to roles
              </button>
              
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Audience Login</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {!otpSent ? 'Enter your email to receive a secure OTP code.' : 'Check your email for the verification code.'}
                </p>
              </div>

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email" required placeholder="Enter your email"
                      value={audienceEmail} onChange={e => setAudienceEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                    {loading ? 'Sending Code...' : 'Request OTP Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Verification Code</label>
                    <input
                      type="text" required placeholder="6-digit OTP"
                      value={otp} onChange={e => setOtp(e.target.value)}
                      className="form-input text-center tracking-[0.2em] font-mono text-lg"
                    />
                    <p className="text-[11px] text-slate-500 mt-2 text-center">Sent to {audienceEmail}</p>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
