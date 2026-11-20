import React, { useEffect, useState } from 'react';
import { Award, ChevronLeft, Medal, Trophy, Users, Zap } from 'lucide-react';
import { adminFetch } from '../admin/shared/AdminUI';

interface LeaderboardEntry {
  rank: number;
  userName: string;
  userEmail: string;
  score: number;
  accuracy: number;
  completedQuizzes: number;
  bestScore: number;
  isCurrentUser?: boolean;
}

interface QuizLeaderboardViewProps {
  onBackToHub: () => void;
}

export const QuizLeaderboardView: React.FC<QuizLeaderboardViewProps> = ({ onBackToHub }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [metric, setMetric] = useState<'points' | 'accuracy' | 'completed' | 'best'>('points');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch<{ entries: LeaderboardEntry[] }>(`/api/quiz/leaderboard?period=${period}&metric=${metric}`)
      .then((res) => setEntries(res.entries || []))
      .catch((err) => setErrorMsg(err.message || 'Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, [period, metric]);

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToHub}
            className="text-xs font-bold text-[var(--accent-cyan)] hover:underline flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Quiz Hub</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white font-display">
            Global Quiz Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Top football trivia masters ranked by performance and career history.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[#070F1B] border border-white/10 p-1">
            {(['week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                  period === p ? 'bg-[var(--accent-cyan)] text-[#050A12]' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking Method Filter */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/10">
        <span className="text-xs font-mono text-slate-400 uppercase">Sort By:</span>
        {(
          [
            { id: 'points', label: 'Total Points' },
            { id: 'accuracy', label: 'Accuracy %' },
            { id: 'completed', label: 'Completed Quizzes' },
            { id: 'best', label: 'Best Score' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMetric(m.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${
              metric === m.id
                ? 'bg-white/10 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Loading Leaderboard Standings...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#070F1B] border border-white/10 text-slate-400 text-xs">
          No leaderboard entries found for this period. Be the first to play!
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {topThree.map((entry, idx) => {
                const place = idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd';
                const podiumColor =
                  idx === 0 ? 'bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border-amber-400/40 text-amber-300' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-400/20 to-slate-600/20 border-slate-300/40 text-slate-200' :
                  'bg-gradient-to-br from-amber-700/20 to-amber-900/20 border-amber-700/40 text-amber-600';

                return (
                  <div key={entry.userEmail} className={`rounded-3xl border p-6 text-center space-y-3 relative shadow-xl ${podiumColor}`}>
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center mx-auto text-base font-extrabold font-display">
                      {place}
                    </div>
                    <div className="font-bold text-white text-base truncate">{entry.userName}</div>
                    <div className="text-xs font-mono opacity-75">{entry.userEmail}</div>
                    <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-mono border-t border-white/10">
                      <div>
                        <div className="opacity-60 text-[10px]">SCORE</div>
                        <div className="font-bold text-white">{entry.score} PTS</div>
                      </div>
                      <div>
                        <div className="opacity-60 text-[10px]">ACCURACY</div>
                        <div className="font-bold text-white">{entry.accuracy}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="rounded-3xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-white/[0.04] border-b border-white/10 text-slate-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Rank</th>
                    <th className="py-3.5 px-4">Player</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4 text-center">Accuracy</th>
                    <th className="py-3.5 px-4 text-center">Completed</th>
                    <th className="py-3.5 px-4 text-right">Best Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {entries.map((entry) => (
                    <tr
                      key={entry.userEmail}
                      className={`hover:bg-white/[0.03] transition-colors ${entry.isCurrentUser ? 'bg-[var(--accent-cyan)]/10 border-l-4 border-[var(--accent-cyan)]' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white">#{entry.rank}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{entry.userName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{entry.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">{entry.score}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-[var(--accent-cyan)]">{entry.accuracy}%</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{entry.completedQuizzes}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">{entry.bestScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
