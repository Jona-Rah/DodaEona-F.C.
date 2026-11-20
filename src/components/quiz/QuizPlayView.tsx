import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock, Flame, ShieldAlert, Trophy, Volume2, VolumeX, XCircle, Zap } from 'lucide-react';
import { adminFetch } from '../admin/shared/AdminUI';
import type { QuizCategory, QuizGameMode, QuizQuestionItem, QuizAttemptRecord } from '../../types/quiz';

interface QuizPlayViewProps {
  mode: QuizGameMode;
  category?: QuizCategory;
  onFinishAttempt: (attemptId: string) => void;
  onBackToHub: () => void;
}

export const QuizPlayView: React.FC<QuizPlayViewProps> = ({
  mode,
  category,
  onFinishAttempt,
  onBackToHub,
}) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<Array<{ text: string; originalIndex: number }>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [questionTimeTaken, setQuestionTimeTaken] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [answersLog, setAnswersLog] = useState<Array<{
    questionId: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    selectedIndex: number;
    isCorrect: boolean;
    explanation: string;
    timeTakenSec: number;
  }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch questions for this mode / category
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (category) params.set('category', category);

    adminFetch<{ questions: QuizQuestionItem[] }>(`/api/quiz/play?${params.toString()}`)
      .then((res) => {
        if (!res.questions || res.questions.length === 0) {
          setErrorMsg('No active questions found for this mode/category. Please check Question Bank in Admin.');
        } else {
          setQuestions(res.questions);
        }
      })
      .catch((err) => setErrorMsg(err.message || 'Failed to load quiz questions.'))
      .finally(() => setLoading(false));
  }, [mode, category]);

  // Shuffle options when question changes
  useEffect(() => {
    if (questions.length === 0 || currentIndex >= questions.length) return;
    const q = questions[currentIndex];
    const optsWithIndex = q.options.map((text, originalIndex) => ({ text, originalIndex }));
    // Shuffle options
    for (let i = optsWithIndex.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optsWithIndex[i], optsWithIndex[j]] = [optsWithIndex[j], optsWithIndex[i]];
    }
    setShuffledOptions(optsWithIndex);
    setSelectedIndex(null);
    setIsCorrect(null);
    setQuestionTimeTaken(0);

    // Timer per question (or 60s total for Time Challenge)
    if (mode === 'time') {
      setTimeLeft(60);
    } else {
      setTimeLeft(30);
    }
  }, [currentIndex, questions, mode]);

  // Global or question timer ticker
  useEffect(() => {
    if (loading || submitting || questions.length === 0 || currentIndex >= questions.length) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired for this question / challenge
          if (mode === 'time') {
            handleTimeChallengeExpire();
            return 0;
          } else {
            handleAnswerSelect(-1); // auto skip
            return 0;
          }
        }
        return prev - 1;
      });
      setQuestionTimeTaken((t) => t + 1);
      setTotalTimeTaken((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitting, currentIndex, questions, mode, selectedIndex]);

  const handleTimeChallengeExpire = () => {
    submitRun();
  };

  const handleAnswerSelect = (shuffledOptIdx: number) => {
    if (selectedIndex !== null || questions.length === 0) return; // already answered

    const q = questions[currentIndex];
    const chosen = shuffledOptIdx >= 0 ? shuffledOptions[shuffledOptIdx] : null;
    const originalChosenIdx = chosen ? chosen.originalIndex : -999;
    const correct = originalChosenIdx === q.correctIndex;

    setSelectedIndex(shuffledOptIdx);
    setIsCorrect(correct);

    // Calculate score based on difficulty and speed bonus
    let pointsEarned = 0;
    if (correct) {
      const basePoints = q.difficulty === 'expert' ? 30 : q.difficulty === 'hard' ? 20 : q.difficulty === 'medium' ? 15 : 10;
      const speedBonus = Math.max(0, 5 - Math.floor(questionTimeTaken / 4));
      pointsEarned = basePoints + speedBonus;
      setScore((s) => s + pointsEarned);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }

    const logEntry = {
      questionId: q.id,
      questionText: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex: originalChosenIdx,
      isCorrect: correct,
      explanation: q.explanation,
      timeTakenSec: questionTimeTaken + 1,
    };
    setAnswersLog((log) => [...log, logEntry]);

    // Survival mode: instant end on incorrect answer
    if (mode === 'survival' && !correct) {
      setTimeout(() => {
        submitRun([...answersLog, logEntry]);
      }, 1200);
      return;
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length || (mode === 'time' && timeLeft <= 0)) {
      submitRun();
    } else {
      setCurrentIndex((idx) => idx + 1);
    }
  };

  const submitRun = async (overrideLog?: typeof answersLog) => {
    if (submitting) return;
    setSubmitting(true);
    const finalLog = overrideLog || answersLog;

    try {
      const res = await adminFetch<{ attempt: QuizAttemptRecord }>('/api/quiz/attempts', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          category,
          answersLog: finalLog,
          totalTimeTaken,
        }),
      });
      onFinishAttempt(res.attempt.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit quiz attempt.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Loading Quiz Arena Questions...</p>
      </div>
    );
  }

  if (errorMsg || questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-[#070F1B] border border-white/10 rounded-3xl p-8">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold uppercase text-white font-display">Quiz Error</h2>
        <p className="text-xs text-slate-300 leading-relaxed">{errorMsg || 'No questions available.'}</p>
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

  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Top HUD Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070F1B] border border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            ✕ Exit
          </button>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/5 text-[var(--accent-cyan)] uppercase">
            {mode} Mode {category ? `· ${category}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Trophy className="w-4 h-4" />
            <span>{score} PTS</span>
          </div>
          {streak > 1 && (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold animate-bounce">
              <Flame className="w-4 h-4" />
              <span>{streak} Streak</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 font-bold ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-cyan)] to-teal-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-3xl bg-[#070F1B] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-cyan)]">
            {currentQ.category} · <span className="capitalize">{currentQ.difficulty}</span>
          </span>
          <span className="text-xs font-mono text-slate-400">
            {currentQ.type === 'true-false' ? 'True / False' : 'Multiple Choice'}
          </span>
        </div>

        <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug font-display">
          {currentQ.question}
        </h2>

        {currentQ.imageUrl && (
          <img src={currentQ.imageUrl} alt="Question context" className="w-full h-56 rounded-2xl object-cover border border-white/10" />
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {shuffledOptions.map((opt, optIdx) => {
            const isSelected = selectedIndex === optIdx;
            const isTargetCorrect = opt.originalIndex === currentQ.correctIndex;

            let btnStyle = 'bg-white/[0.04] border-white/10 hover:border-[var(--accent-cyan)] text-white';
            if (selectedIndex !== null) {
              if (isTargetCorrect) {
                btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
              } else if (isSelected && !isTargetCorrect) {
                btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
              } else {
                btnStyle = 'bg-white/[0.02] border-white/5 opacity-50 text-slate-400';
              }
            }

            return (
              <button
                key={opt.text}
                type="button"
                disabled={selectedIndex !== null || submitting}
                onClick={() => handleAnswerSelect(optIdx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between text-sm sm:text-base font-medium ${btnStyle}`}
              >
                <span>{opt.text}</span>
                {selectedIndex !== null && isTargetCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {selectedIndex !== null && isSelected && !isTargetCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next Button when answered */}
        {selectedIndex !== null && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 animate-fadeIn">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentQ.explanation}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
              >
                {submitting ? 'Submitting Run...' : currentIndex + 1 >= questions.length || mode === 'time' ? 'See Results →' : 'Next Question →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
