import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Globe,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminFetch } from '../admin/shared/AdminUI';
import type { QuizCategory, QuizGameMode, QuizAttemptRecord } from '../../types/quiz';

const CATEGORIES: Array<{
  name: QuizCategory;
  desc: string;
  icon: any;
  color: string;
  badge: string;
}> = [
  { name: 'Football History', desc: 'Evolution of the beautiful game, origin stories and landmark eras.', icon: BookOpen, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400', badge: 'History' },
  { name: 'FIFA World Cup', desc: 'Global showpiece legends, iconic finals, and golden boot winners.', icon: Globe, color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400', badge: 'Global' },
  { name: 'UEFA Champions League', desc: 'European nights, dramatic comebacks, and continental dynasties.', icon: Trophy, color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400', badge: 'Europe' },
  { name: 'European Leagues', desc: 'Domestic battles across Premier League, LaLiga, Serie A, and Bundesliga.', icon: Layers, color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400', badge: 'Leagues' },
  { name: 'Clubs and Their History', desc: 'Emblems, founding years, stadiums, and iconic club rivalries.', icon: ShieldAlert, color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400', badge: 'Clubs' },
  { name: 'Legendary Players', desc: 'Icons of past generations who defined football immortality.', icon: Award, color: 'from-amber-400/20 to-yellow-500/20 border-amber-400/30 text-amber-300', badge: 'Icons' },
  { name: 'Current Football Players', desc: 'Active superstars, Ballon d’Or contenders, and rising prodigies.', icon: Sparkles, color: 'from-sky-400/25 to-cyan-500/25 border-sky-400/30 text-sky-300', badge: 'Stars' },
  { name: 'Managers and Coaches', desc: 'Tactical masterminds, trophy collectors, and revolutionary bosses.', icon: Compass, color: 'from-violet-400/25 to-indigo-500/25 border-violet-400/30 text-violet-300', badge: 'Tactics' },
  { name: 'International Football', desc: 'Continental championships, qualifiers, and national team pride.', icon: Globe, color: 'from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-400', badge: 'Nations' },
  { name: 'Football Records and Statistics', desc: 'Unbreakable milestones, fastest goals, and appearance records.', icon: Zap, color: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/30 text-yellow-400', badge: 'Stats' },
  { name: 'Transfers and Contracts', desc: 'Blockbuster fees, free agents, and landmark transfer windows.', icon: RefreshCw, color: 'from-teal-500/20 to-emerald-600/20 border-teal-500/30 text-teal-400', badge: 'Market' },
  { name: 'Football Rules and Regulations', desc: 'IFAB laws of the game, VAR protocols, and disciplinary codes.', icon: CheckCircle2, color: 'from-stone-500/20 to-slate-600/20 border-stone-500/30 text-stone-300', badge: 'Rules' },
  { name: 'Stadiums and Competitions', desc: 'Cathedrals of football, capacity milestones, and tournament formats.', icon: Trophy, color: 'from-fuchsia-500/20 to-pink-600/20 border-fuchsia-500/30 text-fuchsia-400', badge: 'Venues' },
  { name: 'Difficult Football Trivia', desc: 'Obscure historical trivia designed for football encyclopedias.', icon: Flame, color: 'from-red-600/25 to-rose-700/25 border-red-500/40 text-red-400', badge: 'Expert' },
];

const GAME_MODES: Array<{
  id: QuizGameMode;
  title: string;
  subtitle: string;
  desc: string;
  icon: any;
  color: string;
  badge: string;
}> = [
  { id: 'quick', title: 'Quick Quiz', subtitle: '10 Random Questions', desc: 'A fast-paced test across random football categories.', icon: Zap, color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400', badge: 'Popular' },
  { id: 'classic', title: 'Classic Quiz', subtitle: '20 Progressive Questions', desc: 'Ramping difficulty from easy warm-ups to expert masterclass.', icon: Trophy, color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400', badge: 'Standard' },
  { id: 'survival', title: 'Survival Mode', subtitle: 'One Mistake & Out', desc: 'Up to 45 questions. One incorrect answer instantly ends your run.', icon: ShieldAlert, color: 'from-rose-500/20 to-red-600/20 border-rose-500/40 text-rose-400', badge: 'Hardcore' },
  { id: 'time', title: 'Time Challenge', subtitle: '60 Seconds Sprint', desc: 'Answer as many trivia questions as humanly possible in 60 seconds.', icon: Clock, color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/40 text-emerald-400', badge: 'Speed' },
  { id: 'daily', title: 'Daily Challenge', subtitle: '12 Global Questions', desc: 'Identical questions for everyone today. Exactly one attempt per day.', icon: Calendar, color: 'from-indigo-500/20 to-purple-600/20 border-indigo-500/40 text-indigo-400', badge: 'Daily' },
  { id: 'category', title: 'Category Challenge', subtitle: 'Choose Your Subject', desc: '10 focused questions from your chosen football trivia category.', icon: Layers, color: 'from-purple-500/20 to-pink-600/20 border-purple-500/40 text-purple-400', badge: 'Focused' },
];

interface QuizCentreHubProps {
  onStartQuiz: (mode: QuizGameMode, category?: QuizCategory) => void;
  onOpenLeaderboard: () => void;
  onOpenAttempt: (attemptId: string) => void;
  onOpenAdmin: () => void;
}

export const QuizCentreHub: React.FC<QuizCentreHubProps> = ({
  onStartQuiz,
  onOpenLeaderboard,
  onOpenAttempt,
  onOpenAdmin,
}) => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalPlayers: 0,
    totalAttempts: 0,
  });
  const [topPlayers, setTopPlayers] = useState<Array<{ name: string; score: number; accuracy: number }>>([]);
  const [myAttempts, setMyAttempts] = useState<QuizAttemptRecord[]>([]);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(false);

  useEffect(() => {
    adminFetch<{
      stats: { totalQuestions: number; totalPlayers: number; totalAttempts: number };
      topPlayers: Array<{ name: string; score: number; accuracy: number }>;
      myAttempts: QuizAttemptRecord[];
    }>('/api/quiz/hub')
      .then((data) => {
        setStats(data.stats);
        setTopPlayers(data.topPlayers);
        setMyAttempts(data.myAttempts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#070F1B] via-[#0B1525] to-[#050A12] border border-white/10 p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-cyan)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-xs font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Official DodaEona F.C. Quiz Arena</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white font-display">
            Test Your Football IQ
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Prove your mastery across 14 specialized football categories, climb the global leaderboards, unlock exclusive career achievements, and compete in Daily Challenges.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onStartQuiz('quick')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-teal-400 text-[#050A12] font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Quick Quiz Now</span>
            </button>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>View Leaderboard</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-amber-500/30 transition-all"
              >
                <span>Admin Quiz Dashboard</span>
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/10">
            <div>
              <div className="text-xs text-slate-400 uppercase font-mono">Active Questions</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-display tabular-nums">
                {stats.totalQuestions}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-mono">Total Players</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[var(--accent-cyan)] font-display tabular-nums">
                {stats.totalPlayers}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-mono">Quiz Attempts</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-display tabular-nums">
                {stats.totalAttempts}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Six Game Modes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-white font-display">
              Select Game Mode
            </h2>
            <p className="text-xs text-slate-400">Six distinct ways to test your football expertise.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                onClick={() => {
                  if (mode.id === 'category') {
                    setSelectedCategoryModal(true);
                  } else {
                    onStartQuiz(mode.id);
                  }
                }}
                className={`group relative rounded-2xl bg-gradient-to-br ${mode.color} border p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 shadow-lg`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-white/10 text-white shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono font-bold text-white uppercase">
                    {mode.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                  {mode.title}
                </h3>
                <div className="text-xs font-mono text-[var(--accent-cyan)] mb-2">{mode.subtitle}</div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{mode.desc}</p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                  <span>Play {mode.title}</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 14 Categories Section */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wide text-white font-display">
            Football Trivia Categories
          </h2>
          <p className="text-xs text-slate-400">Explore 14 dedicated football subjects.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                onClick={() => onStartQuiz('category', cat.name)}
                className={`group rounded-2xl bg-gradient-to-br ${cat.color} border p-4 cursor-pointer hover:scale-[1.02] transition-all`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white/10 text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">{cat.badge}</span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors mb-1">
                  {cat.name}
                </h4>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{cat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini Leaderboard & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Top 6 Players */}
        <div className="rounded-2xl bg-[#070F1B] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Quiz Leaderboard Preview</span>
            </h3>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline"
            >
              Full Leaderboard →
            </button>
          </div>

          <div className="space-y-2">
            {topPlayers.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No quiz submissions recorded yet. Be the first!</div>
            ) : (
              topPlayers.slice(0, 6).map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-[var(--accent-cyan)]">{p.score} PTS</span>
                    <span className="text-slate-400">{p.accuracy}% ACC</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="rounded-2xl bg-[#070F1B] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Your Recent Attempts</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{user ? user.email : 'Guest Session'}</span>
          </div>

          <div className="space-y-2">
            {myAttempts.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">You haven't completed any quizzes yet. Start a run above!</div>
            ) : (
              myAttempts.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  onClick={() => onOpenAttempt(att.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{att.mode} Quiz {att.category ? `· ${att.category}` : ''}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{new Date(att.submittedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-amber-400 font-bold">{att.score} PTS</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px]">{att.accuracy}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Selection Modal */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#070F1B] border border-white/15 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-white font-display">Select Trivia Category</h3>
              <button
                type="button"
                onClick={() => setSelectedCategoryModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryModal(false);
                    onStartQuiz('category', cat.name);
                  }}
                  className="text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[var(--accent-cyan)] transition-all group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-[var(--accent-cyan)]">{cat.name}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for category icon import
function Calendar(props: any) {
  return <Clock {...props} />;
}
function RefreshCw(props: any) {
  return <Zap {...props} />;
}
