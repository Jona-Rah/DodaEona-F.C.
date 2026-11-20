import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  MonitorDown,
  RefreshCw,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const {
    isInstallable,
    isInstalled,
    install,
    downloadAppLauncher,
    downloadAppShortcut,
  } = usePWAInstall();

  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<'idle' | 'installing' | 'success'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  // When modal opens, run automated download and progress animation
  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsDownloaded(false);
      setNativeStatus('idle');
      return;
    }

    // Trigger download automatically
    downloadAppLauncher();

    // Fast, realistic progress animation
    setProgress(25);
    const t1 = setTimeout(() => setProgress(65), 200);
    const t2 = setTimeout(() => setProgress(90), 450);
    const t3 = setTimeout(() => {
      setProgress(100);
      setIsDownloaded(true);
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, downloadAppLauncher]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleNativeInstall = async () => {
    setNativeStatus('installing');
    const outcome = await install();
    if (outcome === 'accepted') {
      setNativeStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setNativeStatus('idle');
    }
  };

  const handleDownloadAgain = () => {
    downloadAppLauncher();
    setProgress(30);
    setTimeout(() => setProgress(80), 250);
    setTimeout(() => {
      setProgress(100);
      setIsDownloaded(true);
    }, 500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 landscape-mobile:p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-download-title"
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden text-slate-100 light:text-slate-900 transition-colors max-h-[calc(100dvh-1.5rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent header line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shrink-0" />

        {/* Modal Header */}
        <div className="p-6 pb-4 landscape-mobile:p-3.5 landscape-mobile:pb-2.5 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center shrink-0 p-1.5 shadow-inner">
              <img
                src="/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png"
                alt="DodaEona F.C."
                className="w-full h-full object-contain drop-shadow"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/pwa-192x192.png';
                }}
              />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-[#7ADBF0] light:text-cyan-700 uppercase font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] animate-ping" />
                Automatic App Download
              </div>
              <h2
                id="pwa-download-title"
                className="text-xl font-bold tracking-tight text-white light:text-slate-900 font-sans"
              >
                DodaEona F.C. App
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-3 space-y-4 landscape-mobile:space-y-3">
          {/* Automatic Download Card with animated progress */}
          <div className="rounded-2xl p-5 landscape-mobile:p-3.5 bg-[#0B1525] light:bg-slate-50 border border-[#7ADBF0]/30 light:border-cyan-200 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                {isDownloaded ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#7ADBF0]/20 text-[#7ADBF0] border border-[#7ADBF0]/40 flex items-center justify-center shrink-0 animate-pulse">
                    <Download className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white light:text-slate-900">
                    {isDownloaded ? 'Download Complete!' : 'Downloading Application...'}
                  </div>
                  <div className="text-xs text-slate-400 light:text-slate-500 font-mono">
                    DodaEona_FC_App.html • Standalone App
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#7ADBF0] light:text-cyan-700">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Glowing Progress Track */}
            <div className="w-full h-2 rounded-full bg-black/40 light:bg-slate-200 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(122,219,240,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Status note */}
            <p className="text-xs text-slate-300 light:text-slate-600 mt-3.5 leading-relaxed">
              {isDownloaded
                ? 'Your browser has downloaded the DodaEona F.C. standalone application launcher to your Downloads folder. Double-click or open the file anytime to launch directly in app mode.'
                : 'Automatically saving the standalone application launcher package to your device...'}
            </p>
          </div>

          {/* Quick Action Center (No steps!) */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 light:text-slate-500 font-semibold">
              Instant Actions
            </div>

            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-2.5">
              {/* Launch Now */}
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#7ADBF0] text-[#050A12] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(122,219,240,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch App Now</span>
              </button>

              {/* Download Windows Desktop Shortcut */}
              <button
                type="button"
                onClick={downloadAppShortcut}
                className="w-full px-4 py-3 rounded-xl bg-[#0B1525] hover:bg-white/10 light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-slate-200 light:text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MonitorDown className="w-4 h-4 text-[#D6B56E]" />
                <span>Desktop Shortcut (.url)</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Download Again */}
              <button
                type="button"
                onClick={handleDownloadAgain}
                className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#7ADBF0]" />
                <span>Download Again</span>
              </button>

              {/* Native System Install Prompt if browser supports it */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={nativeStatus === 'installing'}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-[#7ADBF0]/15 hover:bg-[#7ADBF0]/25 border border-[#7ADBF0]/40 text-[#7ADBF0] light:text-cyan-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>
                    {nativeStatus === 'installing' ? 'Installing...' : 'Install to System'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Installed badge if detected */}
          {isInstalled && (
            <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 light:text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>DodaEona F.C. is already installed as a standalone app on this device.</span>
            </div>
          )}

          {/* App Highlights Strip */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/5 light:border-slate-200 text-center">
              <ShieldCheck className="w-4 h-4 mx-auto text-[#7ADBF0] light:text-cyan-700 mb-1" />
              <div className="text-[10px] font-bold text-white light:text-slate-900">Standalone App</div>
              <div className="text-[9px] text-slate-400 light:text-slate-500">Zero address bars</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/5 light:border-slate-200 text-center">
              <Zap className="w-4 h-4 mx-auto text-[#D6B56E] light:text-amber-600 mb-1" />
              <div className="text-[10px] font-bold text-white light:text-slate-900">Offline Caching</div>
              <div className="text-[9px] text-slate-400 light:text-slate-500">Fast asset caching</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/5 light:border-slate-200 text-center">
              <ExternalLink className="w-4 h-4 mx-auto text-[#10B981] light:text-emerald-600 mb-1" />
              <div className="text-[10px] font-bold text-white light:text-slate-900">Always Synced</div>
              <div className="text-[9px] text-slate-400 light:text-slate-500">Auto live database</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 landscape-mobile:p-3.5 landscape-mobile:pt-2.5 flex items-center justify-between border-t border-white/10 light:border-slate-200 bg-[#050A12]/50 light:bg-slate-50/50 shrink-0">
          <div className="text-[11px] text-slate-400 light:text-slate-500 font-mono">
            Direct Download • No Store Needed
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 light:bg-slate-200 light:hover:bg-slate-300 text-white light:text-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
