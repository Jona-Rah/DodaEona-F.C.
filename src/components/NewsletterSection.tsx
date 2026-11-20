import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'invalid' | 'duplicate' | 'error'>('idle');
  const [subscribedEmails, setSubscribedEmails] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();

    // Strict email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setStatus('invalid');
      return;
    }

    if (subscribedEmails.includes(trimmed)) {
      setStatus('duplicate');
      return;
    }

    try {
      const res = await fetch('/api/public/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setStatus('invalid');
        return;
      }
      const data = await res.json();
      setSubscribedEmails((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      if (data?.duplicate) {
        setStatus('duplicate');
        return;
      }
      setStatus('success');
      window.dispatchEvent(new CustomEvent('dodaeona:subscribers-updated'));
    } catch {
      setSubscribedEmails((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setStatus('success');
    }
  };

  return (
    <section 
      aria-label="Newsletter Subscription"
      className="w-full bg-[var(--bg-surface)] py-20 sm:py-28 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] relative overflow-hidden transition-colors duration-200"
    >
      {/* Subtle obsidian cyan ambient wash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-80 bg-[#7ADBF0]/[0.05] rounded-full blur-[150px] pointer-events-none" />

      {/* Centered Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        
        {/* Clean Eyebrow Capsule */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[#7ADBF0]/30 text-[var(--accent-cyan)] eyebrow-mono mb-5 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] light:bg-cyan-600" />
          <span>OFFICIAL NEWSLETTER</span>
        </div>

        {/* Confirmed Anton Display Headline */}
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl landscape-mobile:text-3xl text-[var(--text-primary)] tracking-tight uppercase leading-[0.98]">
          STAY CONNECTED WITH THE GAME.
        </h2>

        {/* Restrained cyan hairline glow bar */}
        <div className="w-20 h-[2px] bg-gradient-to-r from-[#7ADBF0] via-[#7ADBF0]/50 to-transparent rounded-full mt-5 shadow-[0_0_12px_rgba(122,219,240,0.45)] light:from-cyan-600 light:via-cyan-500/40" />

        {/* Confirmed Supporting Description */}
        <p className="mt-5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-normal max-w-2xl text-balance">
          Stay up to date with DodaEona F.C. Receive the latest announcements, new reading releases, platform updates, and exciting football experiences directly in your inbox.
        </p>

        {/* Unboxed Perks Metadata Line */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 eyebrow-mono text-[10px] sm:text-[11px] text-[var(--text-muted)] tracking-[0.2em]">
          <span className="text-[var(--text-secondary)]">WEEKLY TACTICAL BREAKDOWNS</span>
          <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
          <span className="text-[var(--text-secondary)]">NEW VOLUME RELEASES</span>
          <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
          <span className="text-[var(--text-secondary)]">MATCH CENTRE INSIGHTS</span>
        </div>

        {/* Subscription Form */}
        <div className="w-full mt-9 max-w-xl">
          {status === 'success' ? (
            <div className="p-8 rounded-2xl bg-[var(--bg-primary)] border border-[#7ADBF0]/50 text-center shadow-[0_0_35px_rgba(122,219,240,0.16)] animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white mb-4 shadow-lg shadow-[#7ADBF0]/25">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl text-[var(--accent-cyan)] uppercase tracking-wide">
                YOU&apos;RE ON THE LIST!
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                Thank you for subscribing to DodaEona F.C. Keep an eye on your inbox for our latest updates.
              </p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setEmail('');
                  setAgreed(false);
                }}
                className="mt-6 text-xs font-bold text-[var(--accent-cyan)] hover:underline uppercase tracking-wider cursor-pointer"
              >
                Subscribe another email address
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col landscape-mobile:flex-row sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--accent-cyan)]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status !== 'idle') setStatus('idle');
                    }}
                    placeholder="Enter your email address..."
                    aria-label="Email Address"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[#7ADBF0]/50 focus:border-[#7ADBF0]/70 light:focus:border-cyan-600 transition-all"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="px-7 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs sm:text-sm text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 transition-all duration-200 shadow-[0_0_24px_rgba(122,219,240,0.28)] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
                >
                  <span>SUBSCRIBE NOW</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>

              {/* Optional Consent Checkbox */}
              <div className="flex items-center justify-center gap-2.5 text-left text-xs text-[var(--text-secondary)] pt-1">
                <input
                  type="checkbox"
                  id="newsletter-consent"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-color)] text-[#7ADBF0] focus:ring-[#7ADBF0] accent-[#7ADBF0] light:accent-cyan-600 bg-[var(--bg-primary)] cursor-pointer"
                />
                <label htmlFor="newsletter-consent" className="cursor-pointer select-none">
                  I agree to receive official DodaEona F.C. newsletter updates and announcements.
                </label>
              </div>

              {/* Error Feedback Messages */}
              {status === 'invalid' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 light:text-rose-700 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 light:text-rose-600" />
                  <span>Please enter a valid email address (e.g., name@example.com).</span>
                </div>
              )}

              {status === 'duplicate' && (
                <div className="p-3.5 rounded-xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/40 text-[var(--accent-cyan)] text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[var(--accent-cyan)]" />
                  <span>This email is already subscribed to the DodaEona F.C. newsletter!</span>
                </div>
              )}

              {status === 'error' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 light:text-rose-700 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 light:text-rose-600" />
                  <span>Subscription was unsuccessful. Please check your connection and try again.</span>
                </div>
              )}
            </form>
          )}
        </div>

      </div>
    </section>
  );
};
