import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ChevronDown, ChevronUp, Clock, RotateCcw, Trophy, XCircle, Zap } from 'lucide-react';
import { adminFetch } from '../admin/shared/AdminUI';
import type { QuizAttemptRecord } from '../../types/quiz';

interface QuizAttemptReviewViewProps {
  attemptId: string;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onBackToHub: () => void;
  onReportQuestion: (questionId: string, questionText: string) => void;
}

export const QuizAttemptReviewView: React.FC<QuizAttemptReviewViewProps> = ({
  attemptId,
  onPlayAgain,
  onOpenLeaderboard,
  onBackToHub,
  onReportQuestion,
}) => {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<QuizAttemptRecord | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ attempt: QuizAttemptRecord }>(`/api/quiz/attempts/${attemptId}`)
      .then((res) => setAttempt(res.attempt))
      .catch((err) => setErrorMsg(err.message || 'Failed to load attempt review.'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Loading Quiz Results...</p>
      </div>
    );
  }

  if (errorMsg || !attempt) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-[#070F1B] border border-white/10 rounded-3xl p-8">
        <h2 className="text-lg font-bold uppercase text-white font-display">Attempt Not Found</h2>
        <p className="text-xs text-slate-300">{errorMsg || 'Could not retrieve quiz run.'}</p>
        <button
          type="button"
          onClick={onBackToHub}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] text-xs font-bold uppercase tracking-wider"
        >
          Return to Quiz Hub
        </button>
      </div>
    );
  }

  const ratingColor =
    attempt.rating === 'Perfect' ? 'text-amber-400 border-amber-400/40 bg-amber-500/10' :
    attempt.rating === 'Elite' ? 'text-cyan-400 border-cyan-400/40 bg-cyan-500/10' :
    'text-slate-200 border-white/20 bg-white/5';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Results Header Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#070F1B] via-[#0B1525] to-[#050A12] border border-white/10 p-6 sm:p-10 overflow-hidden text-center space-y-4 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent-cyan)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono uppercase tracking-wider mx-auto shadow-md ${ratingColor}`}>
          <Trophy className="w-4 h-4" />
          <span>Rating: {attempt.rating}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold uppercase text-white font-display">
          Quiz Run Complete
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 max-w-xl mx-auto">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-xs text-slate-400 font-mono">Final Score</div>
            <div className="text-2xl font-extrabold text-amber-400 font-display">{attempt.score}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-xs text-slate-400 font-mono">Accuracy</div>
            <div className="text-2xl font-extrabold text-[var(--accent-cyan)] font-display">{attempt.accuracy}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-xs text-slate-400 font-mono">Correct</div>
            <div className="text-2xl font-extrabold text-emerald-400 font-display">{attempt.correctCount} / {attempt.totalQuestions}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-xs text-slate-400 font-mono">Time Taken</div>
            <div className="text-2xl font-extrabold text-white font-display">{attempt.timeTakenSec}s</div>
          </div>
        </div>

        {attempt.unlockedAchievements.length > 0 && (
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-mono text-amber-400">Achievements Unlocked:</span>
            {attempt.unlockedAchievements.map((ach) => (
              <span key={ach} className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>{ach}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={onPlayAgain}
            className="px-6 py-3 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
          >
            View Leaderboard
          </button>
          <button
            type="button"
            onClick={onBackToHub}
            className="px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
          >
            Quiz Hub
          </button>
        </div>
      </div>

      {/* Question Review Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold uppercase tracking-wider text-white font-display">
          Complete Question Review
        </h3>

        <div className="space-y-3">
          {attempt.questionsAnswered.map((q, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={q.questionId + idx}
                className={`rounded-2xl border transition-all ${
                  q.isCorrect ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      q.isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">{q.questionText}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {q.isCorrect ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/10 space-y-3 text-xs sm:text-sm">
                    <div className="space-y-1.5 pt-2">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = optIdx === q.selectedIndex;
                        const isRight = optIdx === q.correctIndex;
                        let optBg = 'bg-white/[0.03] border-white/10 text-slate-300';
                        if (isRight) optBg = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                        else if (isChosen && !isRight) optBg = 'bg-rose-500/20 border-rose-500 text-rose-200';

                        return (
                          <div key={opt} className={`p-2.5 rounded-xl border flex items-center justify-between ${optBg}`}>
                            <span>{opt}</span>
                            {isRight && <span className="text-[10px] font-mono text-emerald-400">Correct Answer</span>}
                            {isChosen && !isRight && <span className="text-[10px] font-mono text-rose-400">Your Answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5">
                      <strong className="text-white">Explanation:</strong> {q.explanation}
                    </p>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-slate-400 font-mono">Answer time: {q.timeTakenSec}s</span>
                      <button
                        type="button"
                        onClick={() => onReportQuestion(q.questionId, q.questionText)}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Report Question Issue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
