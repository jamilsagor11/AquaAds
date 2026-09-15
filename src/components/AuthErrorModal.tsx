import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, Copy, Check, X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { firebaseConfig } from '../firebase';

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain?: string;
}

interface AuthErrorModalProps {
  error: AuthErrorInfo | null;
  onClose: () => void;
  onRetryPopup: () => void;
  onRetryRedirect: () => void;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  error,
  onClose,
  onRetryPopup,
  onRetryRedirect,
}) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;
  if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
    return null;
  }

  const currentDomain = error.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const isUnauthorizedDomain = error.code === 'auth/unauthorized-domain';
  const isPopupBlocked = error.code === 'auth/popup-blocked';

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const copyDomainToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header decoration */}
        <div className={`p-6 ${isUnauthorizedDomain ? 'bg-amber-500 text-white' : isPopupBlocked ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
                {isUnauthorizedDomain ? (
                  <ShieldAlert className="w-6 h-6 text-white" />
                ) : isPopupBlocked ? (
                  <AlertCircle className="w-6 h-6 text-white" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">
                  {isUnauthorizedDomain
                    ? 'Authorize Domain in Firebase'
                    : isPopupBlocked
                    ? 'Pop-up Window Blocked'
                    : 'Sign-in Notice'}
                </h3>
                <p className="text-xs font-medium text-white/90 mt-0.5">
                  {isUnauthorizedDomain
                    ? 'Required one-time setup for Vercel / Custom Hosting'
                    : 'Authentication could not be completed'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-700">
          {isUnauthorizedDomain ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Firebase Authentication blocks login from any domain that is not registered in the{' '}
                <strong className="text-slate-900 font-semibold">Authorized domains</strong> list. To enable Google Sign-In on this Vercel deployment, add this domain to Firebase Console:
              </p>

              {/* Domain copy box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Your Deployment Domain
                  </span>
                  <code className="text-sm font-mono font-bold text-blue-600 truncate block">
                    {currentDomain || 'unknown-domain'}
                  </code>
                </div>
                <button
                  onClick={copyDomainToClipboard}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-all shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Steps Guide */}
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  How to fix in 30 seconds:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <span className="text-slate-700 leading-tight">
                      Open <strong className="text-slate-900">Firebase Authentication Settings</strong> in the console.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <span className="text-slate-700 leading-tight">
                      Under <strong className="text-slate-900">Authorized domains</strong>, click <strong className="text-slate-900">Add domain</strong> and paste <code className="font-mono bg-white px-1 py-0.5 rounded text-blue-600 font-bold">{currentDomain}</code>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <span className="text-slate-700 leading-tight">
                      Click <strong className="text-slate-900">Save</strong> and then return here and click <strong className="text-slate-900">Try Login Again</strong>.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={firebaseConsoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all text-center"
                >
                  <span>Open Firebase Settings</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={onRetryPopup}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Login Again</span>
                </button>
              </div>
            </>
          ) : isPopupBlocked ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Your browser or mobile device blocked the Google Sign-In popup window. You can continue using full-page redirect sign-in instead:
              </p>
              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={onRetryRedirect}
                  className="w-full px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
                >
                  <span>Sign In with Redirect (Mobile Friendly)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onRetryPopup}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                >
                  Try Pop-up Again (Allow Pop-ups in Browser)
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-rose-800">Error Code: {error.code}</p>
                <p className="text-rose-700 font-mono text-[11px] break-words">{error.message}</p>
              </div>
              <p className="text-xs text-slate-500">
                Make sure you are connected to the internet and third-party cookies or pop-ups are allowed for authentication.
              </p>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={onRetryPopup}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={onRetryRedirect}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
                >
                  Use Redirect Sign-In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
