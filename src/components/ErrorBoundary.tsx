import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path || 'unknown path'}`;
            isFirestoreError = true;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-red-50 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Something went wrong</h2>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-left">
              <p className="text-sm font-mono text-slate-600 break-words">
                {errorMessage}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <RefreshCcw className="w-4 h-4" /> Reload
              </button>
            </div>
            {isFirestoreError && (
              <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">
                This error has been logged for our technical team.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
