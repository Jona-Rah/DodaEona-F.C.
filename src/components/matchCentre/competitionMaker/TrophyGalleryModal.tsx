import React from 'react';
import { Trophy, X } from 'lucide-react';
import type { TrophyDesignConfig } from '../../../types/competitionMaker';
import { TrophyGalleryView } from './TrophyGalleryView';

interface TrophyGalleryModalProps {
  isOpen: boolean;
  initialTab?: 'trophies' | 'hall-of-fame';
  onClose: () => void;
  onSelectTrophyForNewCompetition?: (trophy: TrophyDesignConfig) => void;
}

export const TrophyGalleryModal: React.FC<TrophyGalleryModalProps> = ({
  isOpen,
  initialTab = 'trophies',
  onClose,
  onSelectTrophyForNewCompetition,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-2xl border border-white/15 light:border-slate-200 bg-[#070F1B] light:bg-white text-white light:text-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-400 light:text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-xl tracking-wide uppercase">
                Trophy Gallery &amp; Hall of Fame
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Browse, select, or manage tournament silverware and view crowned club champions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-400 light:text-slate-700 cursor-pointer"
            aria-label="Close gallery"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <TrophyGalleryView
            initialSubTab={initialTab}
            compactHeader
            onSelectTrophyForNewCompetition={
              onSelectTrophyForNewCompetition
                ? (tr) => {
                    onSelectTrophyForNewCompetition(tr);
                    onClose();
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
};
