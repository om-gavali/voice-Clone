import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * React Error Boundary — catches render-level JS errors in the component tree
 * and shows a friendly recovery screen instead of a blank white page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console so devs see the full stack
    console.error('[ErrorBoundary] Unhandled render error:', error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Also reload the page as a safe fallback
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env?.DEV;
    const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xl p-8 text-center space-y-5">
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Something Went Wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              The app hit an unexpected error. You can try reloading to recover.
            </p>
          </div>

          {/* Error message */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-left">
            <p className="text-xs text-rose-700 dark:text-rose-300 font-mono break-words">{errorMsg}</p>
            {/* Stack trace only in dev */}
            {isDev && this.state.errorInfo?.componentStack && (
              <details className="mt-2">
                <summary className="text-[11px] text-slate-500 cursor-pointer">Component stack</summary>
                <pre className="text-[10px] text-slate-400 mt-1 overflow-auto whitespace-pre-wrap max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try to Recover
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
