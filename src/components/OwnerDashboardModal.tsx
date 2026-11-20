import React, { useState } from 'react';
import { X, Save, RefreshCw, ShieldCheck, Radio, Type, AlignLeft } from 'lucide-react';
import { Announcement } from '../types/homepage';
import { WelcomeCopyData } from './WelcomeSection';

interface OwnerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement;
  onUpdateAnnouncement: (updated: Announcement) => void;
  heroSubtext: string;
  onUpdateHeroSubtext: (updated: string) => void;
  welcomeCopy: WelcomeCopyData;
  onUpdateWelcomeCopy: (updated: WelcomeCopyData) => void;
}

export const OwnerDashboardModal: React.FC<OwnerDashboardModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onUpdateAnnouncement,
  heroSubtext,
  onUpdateHeroSubtext,
  welcomeCopy,
  onUpdateWelcomeCopy,
}) => {
  // Local edit states
  const [annForm, setAnnForm] = useState(announcement);
  const [heroForm, setHeroForm] = useState(heroSubtext);
  const [welcomeForm, setWelcomeForm] = useState(welcomeCopy);
  const [activeTab, setActiveTab] = useState<'announcement' | 'hero' | 'welcome'>('announcement');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAnnouncement(annForm);
    onUpdateHeroSubtext(heroForm);
    onUpdateWelcomeCopy(welcomeForm);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape-mobile:p-3 bg-slate-950/90 backdrop-blur-xl">
      <div className="bg-[#030a1c] light:bg-white border border-white/[0.15] light:border-slate-300 rounded-2xl w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 landscape-mobile:p-3.5 border-b border-white/[0.08] light:border-slate-200 bg-[#020512]/90 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 landscape-mobile:p-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg landscape-mobile:text-base font-black text-white light:text-slate-900 uppercase tracking-tight">
                Owner Dashboard — Content Controls
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Live Administrative Management for Confirmed Homepage Sections
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 light:border-slate-200 px-6 landscape-mobile:px-4 bg-slate-950/30 light:bg-slate-100 gap-2 pt-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('announcement')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'announcement'
                ? 'border-yellow-400 text-yellow-300 light:text-yellow-700'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Section 2: Announcement</span>
          </button>

          <button
            onClick={() => setActiveTab('hero')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'hero'
                ? 'border-yellow-400 text-yellow-300 light:text-yellow-700'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Section 3: Hero Subtext</span>
          </button>

          <button
            onClick={() => setActiveTab('welcome')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'welcome'
                ? 'border-yellow-400 text-yellow-300 light:text-yellow-700'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Section 4: Welcome Message</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 landscape-mobile:p-4 space-y-6 landscape-mobile:space-y-4 flex-1 overflow-y-auto">
          
          {/* TAB 1: ANNOUNCEMENT */}
          {activeTab === 'announcement' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                <div>
                  <span className="text-sm font-bold text-white light:text-slate-900 block">Banner Active Status</span>
                  <span className="text-xs text-slate-400 light:text-slate-600">
                    When active, banner is permanently visible without visitor close button.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={annForm.active}
                  onChange={(e) => setAnnForm({ ...annForm, active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 text-yellow-400 focus:ring-yellow-400 bg-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Badge Label
                </label>
                <input
                  type="text"
                  value={annForm.badge || ''}
                  onChange={(e) => setAnnForm({ ...annForm, badge: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  value={annForm.message}
                  onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={annForm.actionText || ''}
                    onChange={(e) => setAnnForm({ ...annForm, actionText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Destination Key
                  </label>
                  <input
                    type="text"
                    value={annForm.actionUrl || ''}
                    onChange={(e) => setAnnForm({ ...annForm, actionUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HERO SUBTEXT */}
          {activeTab === 'hero' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/40 light:bg-blue-50 border border-blue-800/40 light:border-blue-200 rounded-lg text-xs text-blue-200 light:text-blue-900">
                Headline is fixed to: <span className="font-bold text-white light:text-slate-900">&quot;MORE THAN A GAME. A WHOLE FOOTBALL WORLD.&quot;</span>
                <br />
                The supporting description beneath the headline can be modified here anytime by the administrator.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Hero Supporting Description / Subtext
                </label>
                <textarea
                  rows={4}
                  value={heroForm}
                  onChange={(e) => setHeroForm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: WELCOME COPY */}
          {activeTab === 'welcome' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={welcomeForm.heading}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, heading: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Sub-Heading
                </label>
                <input
                  type="text"
                  value={welcomeForm.subheading}
                  onChange={(e) => setWelcomeForm({ ...welcomeForm, subheading: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Paragraph 1
                </label>
                <textarea
                  rows={2}
                  value={welcomeForm.paragraphs[0] || ''}
                  onChange={(e) => {
                    const next = [...welcomeForm.paragraphs];
                    next[0] = e.target.value;
                    setWelcomeForm({ ...welcomeForm, paragraphs: next });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Paragraph 2
                </label>
                <textarea
                  rows={3}
                  value={welcomeForm.paragraphs[1] || ''}
                  onChange={(e) => {
                    const next = [...welcomeForm.paragraphs];
                    next[1] = e.target.value;
                    setWelcomeForm({ ...welcomeForm, paragraphs: next });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Paragraph 3
                </label>
                <textarea
                  rows={2}
                  value={welcomeForm.paragraphs[2] || ''}
                  onChange={(e) => {
                    const next = [...welcomeForm.paragraphs];
                    next[2] = e.target.value;
                    setWelcomeForm({ ...welcomeForm, paragraphs: next });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={welcomeForm.tagline}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Sign-off
                  </label>
                  <input
                    type="text"
                    value={welcomeForm.signoff}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, signoff: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-sm text-white light:text-slate-900 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 light:border-slate-200 flex items-center justify-between">
            {savedNotice ? (
              <span className="text-xs font-bold text-emerald-400 light:text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Changes saved and published live to homepage!
              </span>
            ) : (
              <span className="text-xs text-slate-500 light:text-slate-600">
                Updates take effect immediately on the homepage.
              </span>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Live Changes</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
