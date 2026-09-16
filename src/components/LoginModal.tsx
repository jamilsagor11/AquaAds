import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, ShieldCheck, Droplets } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'signup';
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, initialTab = 'login', onClose }) => {
  const { loginDirect, signupDirect } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Error feedback
  const [formError, setFormError] = useState<string | null>(null);

  // Synchronize initialTab when modal opens & reset errors
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFormError(null);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    loginDirect(cleanEmail);
    onClose();
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = signupEmail.trim();
    const cleanName = signupName.trim();
    const cleanCompany = signupCompany.trim();

    if (!cleanEmail) {
      setFormError('Please enter your work email.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    signupDirect(cleanEmail, cleanName || undefined, cleanCompany || undefined);
    onClose();
  };

  return (
    <div
      id="login-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="login-modal-card"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[calc(100vh-2rem)] flex flex-col"
      >
        {/* Header with AquaAds Brand styling */}
        <div className="p-6 sm:p-7 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative shrink-0">
          <button
            id="login-modal-close-btn"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-wider text-blue-100 uppercase">
              AquaAds Platform
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {activeTab === 'login' ? 'Sign In to AquaAds' : 'Create an Account'}
          </h2>
          <p className="text-blue-100/90 text-xs sm:text-sm mt-1 font-normal leading-relaxed">
            {activeTab === 'login'
              ? 'Access your sustainable water bottle campaigns and live distribution stats.'
              : 'Start advertising on eco-friendly paper water bottles in minutes.'}
          </p>
        </div>

        {/* 2-Option Segmented Tab Switcher */}
        <div className="px-6 pt-4 pb-2 bg-slate-50/90 border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl gap-1">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setActiveTab('login');
                setFormError(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Log In</span>
            </button>
            <button
              id="tab-signup-btn"
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setFormError(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sign Up</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form id="login-form" onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoFocus
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  Instant sign-in
                </span>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Toggle to Signup */}
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Need a new account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setFormError(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Create one here
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIGNUP */}
          {activeTab === 'signup' && (
            <form id="signup-form" onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-name-input"
                    type="text"
                    autoFocus
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Brand Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-company-input"
                    type="text"
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    placeholder="e.g. EcoDrink Beverages"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Work Email <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="sarah@ecodrink.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Create Password <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password-input"
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-blue-700 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Instant access — zero database config required</span>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Toggle to Login */}
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setFormError(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Log in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
