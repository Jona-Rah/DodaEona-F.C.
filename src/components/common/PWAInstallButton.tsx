import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'hero' | 'navbar' | 'compact' | 'footer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const { isInstalled, isInstallable, downloadAppLauncher } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadAppLauncher();
    setIsModalOpen(true);
  };

  if (variant === 'navbar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          title={isInstalled ? 'DodaEona F.C. is installed as an app' : 'Install DodaEona F.C. on this device'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
            isInstalled
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 light:bg-emerald-50 light:border-emerald-300 light:text-emerald-700'
              : 'bg-[#7ADBF0]/10 hover:bg-[#7ADBF0]/20 border border-[#7ADBF0]/40 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-300 light:text-cyan-800 shadow-[0_0_12px_rgba(122,219,240,0.15)]'
          } ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span className="hidden sm:inline">Installed</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700 animate-pulse" />
              <span>Install App</span>
            </>
          )}
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isInstalled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white hover:border-[#7ADBF0]/50'
          } ${className}`}
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>App Installed</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-[#7ADBF0]" />
              <span>Install App</span>
            </>
          )}
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Hero variant (prominent, bold, matching DodaEona F.C. design language)
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] ${
          isInstalled
            ? 'bg-[#0B1525] border border-emerald-500/40 text-emerald-300 light:bg-emerald-50 light:border-emerald-300 light:text-emerald-800 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
            : 'bg-gradient-to-r from-[#070F1B] via-[#0B1525] to-[#070F1B] light:from-white light:via-slate-50 light:to-white border border-[#7ADBF0]/50 text-[#7ADBF0] light:text-cyan-800 shadow-[0_0_24px_rgba(122,219,240,0.25)] hover:border-[#7ADBF0] hover:shadow-[0_0_32px_rgba(122,219,240,0.4)]'
        } ${className}`}
      >
        {/* Subtle breathing glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#7ADBF0]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

        {isInstalled ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
            <span className="font-sans">App Installed</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Ready
            </span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:translate-y-0.5" />
            <span className="font-sans">Install App</span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-100 light:text-cyan-800 font-mono">
              PWA
            </span>
          </>
        )}
      </button>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
