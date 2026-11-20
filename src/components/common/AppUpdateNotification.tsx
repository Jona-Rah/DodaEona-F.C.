import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const AppUpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    const handleForceUpdateCheck = () => {
      const dismissed = sessionStorage.getItem('dodaeona_update_dismissed');
      if (!dismissed) {
        setUpdateAvailable(true);
      }
    };
    window.addEventListener('dodaeona:check-update', handleForceUpdateCheck);

    return () => {
      window.removeEventListener('dodaeona:check-update', handleForceUpdateCheck);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="New website version available"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-md w-full animate-bounce-subtle"
    >
      <div className="rounded-2xl bg-gradient-to-r from-[#0C1527] via-[#09101E] to-[#060B14] light:from-slate-900 light:to-slate-800 border border-[#7ADBF0]/50 shadow-2xl p-4 flex items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0891B2]/30 border border-[#7ADBF0]/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#7ADBF0]" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7ADBF0]">New Version Available</h4>
            <p className="text-[11px] text-slate-300">
              A fresh update with performance enhancements is ready.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#06B6D4] hover:brightness-110 text-white text-xs font-mono uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUpdateAvailable(false);
              sessionStorage.setItem('dodaeona_update_dismissed', '1');
            }}
            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
