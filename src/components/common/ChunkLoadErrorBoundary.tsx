import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  clearModuleCachesAndForceReload,
  clearTrackedModuleErrors,
  extractFailedModuleUrl,
  getTrackedModuleErrors,
  inferModuleNameFromMessage,
  recordModuleError,
  type TrackedModuleError,
} from '../../utils/matchCentreErrorTracker';

interface ChunkLoadErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  resetKey?: string;
  moduleName?: string;
  sectionKey?: string;
}

interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  failedModuleName: string;
  failedUrl?: string;
  attemptCount: number;
  retryNonce: number;
  isRetrying: boolean;
  showLogDrawer: boolean;
  trackedLog: TrackedModuleError[];
}

export class ChunkLoadErrorBoundary extends React.Component<
  ChunkLoadErrorBoundaryProps,
  ChunkLoadErrorBoundaryState
> {
  constructor(props: ChunkLoadErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      failedModuleName: props.moduleName || '',
      failedUrl: undefined,
      attemptCount: 0,
      retryNonce: 0,
      isRetrying: false,
      showLogDrawer: false,
      trackedLog: [],
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<ChunkLoadErrorBoundaryState> {
    const message =
      error instanceof Error ? error.message : String(error || 'Unable to load section.');
    return {
      hasError: true,
      errorMessage: message,
      failedUrl: extractFailedModuleUrl(message),
      isRetrying: false,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error || '');
    const resolvedModule =
      this.props.moduleName ||
      inferModuleNameFromMessage(message, this.props.sectionKey || 'MatchCentreModule');

    const recorded = recordModuleError({
      error,
      moduleName: resolvedModule,
      sectionKey: this.props.sectionKey || this.props.resetKey,
      componentStack: info.componentStack || undefined,
    });

    this.setState({
      failedModuleName: recorded.moduleName,
      failedUrl: recorded.failedUrl,
      attemptCount: recorded.attemptCount,
      trackedLog: getTrackedModuleErrors(),
    });
  }

  componentDidUpdate(prevProps: ChunkLoadErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        errorMessage: '',
        isRetrying: false,
        showLogDrawer: false,
      });
    }
  }

  private handleRetry = async () => {
    if (this.state.isRetrying) return;
    this.setState({ isRetrying: true });

    try {
      await clearModuleCachesAndForceReload({
        moduleName: this.state.failedModuleName || this.props.moduleName,
        failedUrl: this.state.failedUrl,
      });
    } finally {
      this.setState((prev) => ({
        hasError: false,
        errorMessage: '',
        isRetrying: false,
        retryNonce: prev.retryNonce + 1,
      }));
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleToggleLog = () => {
    this.setState((prev) => ({
      showLogDrawer: !prev.showLogDrawer,
      trackedLog: getTrackedModuleErrors(),
    }));
  };

  private handleClearLog = () => {
    clearTrackedModuleErrors();
    this.setState({ trackedLog: [] });
  };

  render() {
    if (this.state.hasError) {
      const moduleLabel = this.state.failedModuleName || this.props.moduleName;
      return (
        <div className="min-h-[45vh] flex items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full rounded-2xl bg-[var(--bg-surface)] border border-white/10 light:border-slate-200 p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-xl uppercase tracking-wide text-[var(--text-primary)]">
                {this.props.fallbackTitle || 'Module Unavailable'}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                This section could not be loaded cleanly. Use Retry to clear cached module chunks and force-reload the component.
              </p>
              {moduleLabel && (
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 light:text-slate-600 tabular-nums pt-0.5">
                  Module: {moduleLabel}
                  {this.state.attemptCount > 0 ? ` · Attempt #${this.state.attemptCount}` : ''}
                </p>
              )}
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-amber-400/90 light:text-amber-700 break-words pt-1">
                  {this.state.errorMessage}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={this.state.isRetrying}
                onClick={() => void this.handleRetry()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] disabled:opacity-60 text-white text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${this.state.isRetrying ? 'animate-spin' : ''}`}
                />
                <span>{this.state.isRetrying ? 'Clearing Cache...' : 'Retry'}</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 light:bg-slate-100 hover:bg-white/15 light:hover:bg-slate-200 text-[var(--text-primary)] text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleToggleLog}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 light:border-slate-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
              >
                <span>Failure Log ({this.state.trackedLog.length})</span>
                {this.state.showLogDrawer ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {this.state.showLogDrawer && (
              <div className="text-left rounded-xl bg-black/30 light:bg-slate-50 border border-white/10 light:border-slate-200 p-3 space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 light:border-slate-200">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 font-bold">
                    Captured Import Failure Log
                  </span>
                  {this.state.trackedLog.length > 0 && (
                    <button
                      type="button"
                      onClick={this.handleClearLog}
                      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
                {this.state.trackedLog.length === 0 ? (
                  <p className="text-[11px] font-mono text-slate-500">No tracked errors.</p>
                ) : (
                  this.state.trackedLog.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="text-[11px] font-mono space-y-0.5 py-1.5 border-b last:border-b-0 border-white/[0.06] light:border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#7ADBF0] light:text-cyan-700">
                          {entry.moduleName} ({entry.category})
                        </span>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-300 light:text-slate-700 break-words">
                        {entry.errorMessage}
                      </div>
                      {entry.failedUrl && (
                        <div className="text-[10px] text-slate-500 truncate">{entry.failedUrl}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
  }
}
