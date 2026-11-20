import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  Trophy,
  Shield,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OFFICIAL_ASSETS } from '../data/mockData';
import { NavigationDestination } from '../types/homepage';

interface LoginPageProps {
  onNavigate: (dest: NavigationDestination) => void;
  onAdminRedirect: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onAdminRedirect }) => {
  const { login, loginWithGoogle, register, isAuthenticated, isLoading, user, logout } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotHintOpen, setForgotHintOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const res = await loginWithGoogle();
    setGoogleSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Unable to sign in with Google.');
      return;
    }
    if (res.user?.role === 'admin') {
      onAdminRedirect();
    } else {
      onNavigate('my-library');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'login') {
      const res = await login(email, password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error || 'Unable to sign in.');
        return;
      }
      if (res.user?.role === 'admin') {
        onAdminRedirect();
      } else {
        onNavigate('my-library');
      }
    } else {
      const res = await register(name, email, password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error || 'Unable to create account.');
        return;
      }
      onNavigate('my-library');
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-[75vh] landscape-mobile:min-h-[60vh] flex items-center justify-center px-4 py-12 bg-[#060B13] light:bg-[#F4F7FA]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#7ADBF0]/30 border-t-[#7ADBF0] animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 light:text-slate-600">
            Restoring session...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="relative min-h-[84vh] landscape-mobile:min-h-0 flex items-center justify-center px-4 py-12 landscape-mobile:py-6 overflow-hidden bg-[#060B13] light:bg-[#F4F7FA]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 light:opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(56, 189, 248, 0.16), transparent), repeating-linear-gradient(108deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 140px)',
          }}
        />
        <div className="relative z-10 max-w-md w-full rounded-2xl bg-[#0E141E]/95 light:bg-white border border-white/[0.1] light:border-slate-200 p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/30 text-[var(--accent-cyan)] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <span className="eyebrow-mono text-[var(--accent-cyan)] block">ACTIVE SESSION</span>
            <h1 className="font-display text-3xl text-[var(--text-primary)] tracking-wide">
              {user.name}
            </h1>
            <p className="text-xs font-mono text-[var(--text-muted)]">{user.email}</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            {user.role === 'admin' ? (
              <button
                type="button"
                onClick={onAdminRedirect}
                className="w-full py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Open Control Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('my-library')}
                className="w-full py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Go to My library</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] light:bg-slate-100 border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[86vh] landscape-mobile:min-h-0 flex items-center justify-center overflow-hidden bg-[#060B13] light:bg-[#F4F7FA] px-4 sm:px-6 lg:px-8 py-12 landscape-mobile:py-6 lg:py-16 transition-colors duration-200">
      {/* Floodlight Radial Atmosphere & Subtle Diagonal Pitch Lines */}
      <div
        className="pointer-events-none absolute inset-0 light:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 55% 45% at 15% 12%, rgba(56, 189, 248, 0.16), transparent 70%), radial-gradient(ellipse 40% 35% at 88% 85%, rgba(16, 185, 129, 0.08), transparent 70%), repeating-linear-gradient(108deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 130px)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden light:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 55% 45% at 15% 12%, rgba(8, 145, 178, 0.11), transparent 70%), radial-gradient(ellipse 40% 35% at 88% 85%, rgba(197, 160, 89, 0.09), transparent 70%), repeating-linear-gradient(108deg, rgba(15,23,42,0.04) 0px, rgba(15,23,42,0.04) 1px, transparent 1px, transparent 130px)',
        }}
      />
      {/* Lit Bottom Pitch Band matching reference */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#143747]/65 via-[#0E2633]/35 to-transparent light:from-cyan-500/10 light:via-cyan-500/5 light:to-transparent" />

      <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-10 landscape-mobile:gap-6 lg:gap-12 items-center">
        {/* LEFT COLUMN: Club Crest Brand Header, Floodlight Headline & Active Features */}
        <div className="landscape-mobile:col-span-5 lg:col-span-6 space-y-7 landscape-mobile:space-y-4 text-left">
          {/* Brand Crest Row (Club Logo instead of "D" beside DODAEONA F.C.) */}
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0D1624] light:bg-white border border-white/15 light:border-slate-200 p-1.5 flex items-center justify-center shadow-lg shrink-0">
              <img
                src={OFFICIAL_ASSETS.emblem}
                alt="DodaEona F.C. official crest"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display text-xl sm:text-2xl tracking-[0.06em] uppercase text-white light:text-slate-900">
              DODAEONA F.C.
            </span>
          </div>

          <div className="space-y-4">
            <span className="block font-mono text-[11px] tracking-[0.26em] uppercase text-[#7ADBF0] light:text-cyan-700 font-semibold">
              MEMBERS ONLY · THE ARCHIVE AFTER DARK
            </span>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.25rem] uppercase leading-[0.94] tracking-[0.015em] text-white light:text-slate-900">
              THE FLOODLIGHTS
              <span className="block bg-gradient-to-r from-[#7ADBF0] via-[#E5C384] to-[#6EE7B7] light:from-cyan-600 light:via-amber-600 light:to-emerald-600 bg-clip-text text-transparent">
                ARE ON.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 light:text-slate-600 leading-relaxed max-w-md">
              Sign in with your email and password or Google account to open the shelf, the Match Centre and
              everything the club keeps behind the gate.
            </p>
          </div>

          {/* Feature Pillars (strictly active site capabilities) */}
          <div className="space-y-4 pt-1 max-w-md">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] light:bg-white border border-white/10 light:border-slate-200 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0 shadow-sm">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900 leading-snug">
                  The Match Centre
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5 leading-relaxed">
                  Explore clubs and national teams, open club dossiers and simulate fixtures.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] light:bg-white border border-white/10 light:border-slate-200 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0 shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900 leading-snug">
                  The shelf
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5 leading-relaxed">
                  Read the full library and keep your place in every volume.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] light:bg-white border border-white/10 light:border-slate-200 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0 shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900 leading-snug">
                  Your reading desk
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5 leading-relaxed">
                  Save bookmarks, manage your own created teams and pick up right where you left off.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sign-In Card + Account Footer */}
        <div className="landscape-mobile:col-span-7 lg:col-span-6 flex flex-col items-center lg:items-end">
          <div className="w-full max-w-md space-y-5">
            <div className="rounded-2xl bg-[#0F151F]/95 light:bg-white border border-white/[0.09] light:border-slate-200 p-7 sm:p-8 landscape-mobile:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] light:shadow-xl space-y-6 landscape-mobile:space-y-4">
              {/* Card Header with Gradient Square Icon */}
              <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.08] light:border-slate-200">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C5A059] via-[#9DC89B] to-[#6EE7B7] text-[#050A12] flex items-center justify-center shrink-0 shadow-md">
                  {mode === 'login' ? (
                    <LogIn className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl sm:text-[1.75rem] uppercase tracking-wide text-white light:text-slate-900 leading-none">
                    {mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                  </h2>
                  <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
                    {mode === 'login'
                      ? 'Enter your email and password to come inside'
                      : 'Create your member account and set your password'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {forgotHintOpen && (
                <div className="p-3.5 rounded-xl bg-[#7ADBF0]/10 light:bg-cyan-50 border border-[#7ADBF0]/30 light:border-cyan-200 text-slate-200 light:text-cyan-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700 shrink-0 mt-0.5" />
                  <span>
                    Contact the club administrator via the Contact desk or sign in with your account credentials; signed-in members can update passwords in Account &amp; Security.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200 light:text-slate-700 block">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1018] light:bg-slate-50 border border-white/[0.1] light:border-slate-300 text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 light:text-slate-700 block">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1018] light:bg-slate-50 border border-white/[0.1] light:border-slate-300 text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-200 light:text-slate-700 block">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setForgotHintOpen((v) => !v)}
                        className="text-xs font-medium text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B1018] light:bg-slate-50 border border-white/[0.1] light:border-slate-300 text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || googleSubmitting}
                  className="w-full py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 disabled:opacity-60 text-[#050A12] light:text-white font-bold text-sm transition-all shadow-[0_0_24px_rgba(122,219,240,0.22)] cursor-pointer mt-2"
                >
                  {submitting
                    ? 'Authenticating...'
                    : mode === 'login'
                    ? 'Log in'
                    : 'Create account'}
                </button>
              </form>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-white/[0.08] light:border-slate-200" />
                <span className="shrink-0 mx-3 font-mono text-[10px] tracking-[0.22em] uppercase text-slate-400 light:text-slate-500">
                  OR
                </span>
                <div className="flex-grow border-t border-white/[0.08] light:border-slate-200" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting || googleSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] light:bg-slate-50 light:hover:bg-slate-100 border border-white/[0.12] light:border-slate-300 disabled:opacity-60 text-white light:text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>
                    {googleSubmitting ? 'Signing in with Google...' : 'Continue with Google'}
                  </span>
                </button>
                <p className="text-[11px] text-center text-slate-400 light:text-slate-500">
                  If your Google email is not registered yet, a member account is created automatically.
                </p>
              </div>
            </div>

            {/* Footer Callout matching reference */}
            <div className="text-center space-y-2 px-2">
              <p className="text-xs text-slate-300 light:text-slate-700">
                {mode === 'login' ? (
                  <>
                    New to the club?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                        setForgotHintOpen(false);
                      }}
                      className="font-semibold text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
                    >
                      Create an account and set your password
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className="font-semibold text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
                    >
                      Sign in with email &amp; password
                    </button>
                  </>
                )}
              </p>

              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-slate-400 light:text-slate-500 leading-relaxed">
                ACCESS IS PERSONAL · EVERY PAGE NEEDS A SIGNED-IN ACCOUNT
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
