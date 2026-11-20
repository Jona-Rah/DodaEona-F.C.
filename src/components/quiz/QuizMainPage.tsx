import React, { useState } from 'react';
import { QuizCentreHub } from './QuizCentreHub';
import { QuizPlayView } from './QuizPlayView';
import { QuizLeaderboardView } from './QuizLeaderboardView';
import { QuizAttemptReviewView } from './QuizAttemptReviewView';
import type { QuizCategory, QuizGameMode } from '../../types/quiz';
import { adminFetch } from '../admin/shared/AdminUI';
import { useAuth } from '../../context/AuthContext';

interface QuizMainPageProps {
  onOpenAdmin: () => void;
}

export const QuizMainPage: React.FC<QuizMainPageProps> = ({ onOpenAdmin }) => {
  const [subView, setSubView] = useState<'hub' | 'play' | 'leaderboard' | 'review'>('hub');
  const [playMode, setPlayMode] = useState<QuizGameMode>('quick');
  const [playCategory, setPlayCategory] = useState<QuizCategory | undefined>(undefined);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const { user } = useAuth();
  const [reportModal, setReportModal] = useState<{ open: boolean; questionId: string; questionText: string }>({
    open: false,
    questionId: '',
    questionText: '',
  });
  const [reportReason, setReportReason] = useState<'Incorrect Answer' | 'Outdated Information' | 'Unclear Wording' | 'Typographical Error' | 'Other'>('Incorrect Answer');
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const handleStartQuiz = (mode: QuizGameMode, category?: QuizCategory) => {
    setPlayMode(mode);
    setPlayCategory(category);
    setSubView('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishAttempt = (attemptId: string) => {
    setActiveAttemptId(attemptId);
    setSubView('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAttempt = (attemptId: string) => {
    setActiveAttemptId(attemptId);
    setSubView('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/quiz/reports', {
        method: 'POST',
        body: JSON.stringify({
          questionId: reportModal.questionId,
          questionText: reportModal.questionText,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportStatus('Question error successfully reported to administrators. Thank you!');
      setTimeout(() => {
        setReportModal({ open: false, questionId: '', questionText: '' });
        setReportStatus(null);
        setReportDetails('');
      }, 2000);
    } catch (err: any) {
      setReportStatus(err.message || 'Failed to submit report.');
    }
  };

  return (
    <div className="space-y-6">
      {subView === 'hub' && (
        <QuizCentreHub
          onStartQuiz={handleStartQuiz}
          onOpenLeaderboard={() => setSubView('leaderboard')}
          onOpenAttempt={handleOpenAttempt}
          onOpenAdmin={onOpenAdmin}
        />
      )}

      {subView === 'play' && (
        <QuizPlayView
          mode={playMode}
          category={playCategory}
          onFinishAttempt={handleFinishAttempt}
          onBackToHub={() => setSubView('hub')}
        />
      )}

      {subView === 'leaderboard' && (
        <QuizLeaderboardView onBackToHub={() => setSubView('hub')} />
      )}

      {subView === 'review' && activeAttemptId && (
        <QuizAttemptReviewView
          attemptId={activeAttemptId}
          onPlayAgain={() => handleStartQuiz(playMode, playCategory)}
          onOpenLeaderboard={() => setSubView('leaderboard')}
          onBackToHub={() => setSubView('hub')}
          onReportQuestion={(qId, qText) => setReportModal({ open: true, questionId: qId, questionText: qText })}
        />
      )}

      {/* Report Modal */}
      {reportModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#070F1B] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-white font-display">Report Question Issue</h3>
              <button
                type="button"
                onClick={() => setReportModal({ open: false, questionId: '', questionText: '' })}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {reportStatus ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs text-center font-bold">
                {reportStatus}
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                <div>
                  <div className="text-slate-400 font-mono mb-1">Question:</div>
                  <div className="text-white font-semibold line-clamp-2">{reportModal.questionText}</div>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e: any) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  >
                    <option value="Incorrect Answer">Incorrect Answer</option>
                    <option value="Outdated Information">Outdated Information</option>
                    <option value="Unclear Wording">Unclear Wording</option>
                    <option value="Typographical Error">Typographical Error</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Details (Optional)</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe the issue..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModal({ open: false, questionId: '', questionText: '' })}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] font-extrabold uppercase"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
