import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit2,
  Filter,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { adminFetch } from '../admin/shared/AdminUI';
import type { QuizCategory, QuizDifficulty, QuizQuestionItem, QuizDailyScheduleRecord, QuizReportRecord } from '../../types/quiz';

const CATEGORIES: QuizCategory[] = [
  'Football History',
  'FIFA World Cup',
  'UEFA Champions League',
  'European Leagues',
  'Clubs and Their History',
  'Legendary Players',
  'Current Football Players',
  'Managers and Coaches',
  'International Football',
  'Football Records and Statistics',
  'Transfers and Contracts',
  'Football Rules and Regulations',
  'Stadiums and Competitions',
  'Difficult Football Trivia',
];

export const QuizAdminView: React.FC<{ onBackToHub: () => void }> = ({ onBackToHub }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'daily' | 'reports'>('questions');

  // Question Bank State
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionItem | null>(null);

  // Question Form State
  const [qForm, setQForm] = useState<{
    category: QuizCategory;
    difficulty: QuizDifficulty;
    type: 'multiple-choice' | 'true-false' | 'image';
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    imageUrl: string;
    active: boolean;
  }>({
    category: 'Football History',
    difficulty: 'medium',
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
    imageUrl: '',
    active: true,
  });

  // Daily Scheduler State
  const [dailies, setDailies] = useState<QuizDailyScheduleRecord[]>([]);
  const [dailyModal, setDailyModal] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    questionCount: 12,
  });

  // Reports State
  const [reports, setReports] = useState<QuizReportRecord[]>([]);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{
        questions: QuizQuestionItem[];
        dailies: QuizDailyScheduleRecord[];
        reports: QuizReportRecord[];
      }>('/api/quiz/admin/data');
      setQuestions(res.questions || []);
      setDailies(res.dailies || []);
      setReports(res.reports || []);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to load quiz admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.question.trim() || qForm.options.some((o) => !o.trim())) {
      setStatusMessage('Question text and all four answer options are required.');
      return;
    }

    try {
      if (editingQuestion) {
        await adminFetch(`/api/quiz/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(qForm),
        });
        setStatusMessage('Question updated successfully.');
      } else {
        await adminFetch('/api/quiz/admin/questions', {
          method: 'POST',
          body: JSON.stringify(qForm),
        });
        setStatusMessage('New question created successfully.');
      }
      setQuestionModal(false);
      setEditingQuestion(null);
      loadAdminData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await adminFetch(`/api/quiz/admin/questions/${id}`, { method: 'DELETE' });
      setStatusMessage('Question deleted.');
      loadAdminData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to delete question.');
    }
  };

  const handleScheduleDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/quiz/admin/schedule', {
        method: 'POST',
        body: JSON.stringify(dailyForm),
      });
      setStatusMessage('Daily challenge scheduled successfully.');
      setDailyModal(false);
      loadAdminData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to schedule daily challenge.');
    }
  };

  const handleDeleteDaily = async (id: string) => {
    try {
      await adminFetch(`/api/quiz/admin/schedule/${id}`, { method: 'DELETE' });
      setStatusMessage('Daily schedule removed.');
      loadAdminData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to remove daily schedule.');
    }
  };

  const handleUpdateReport = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await adminFetch(`/api/quiz/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setStatusMessage(`Report marked as ${status}.`);
      loadAdminData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to update report.');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterCategory !== 'all' && q.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    if (searchQuery.trim()) {
      return q.question.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToHub}
            className="text-xs font-bold text-[var(--accent-cyan)] hover:underline mb-1"
          >
            ← Return to Quiz Hub
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase text-white font-display">
            Quiz Management Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Manage question banks, schedule daily challenges, and resolve user reports.
          </p>
        </div>

        {activeTab === 'questions' && (
          <button
            type="button"
            onClick={() => {
              setEditingQuestion(null);
              setQForm({
                category: 'Football History',
                difficulty: 'medium',
                type: 'multiple-choice',
                question: '',
                options: ['', '', '', ''],
                correctIndex: 0,
                explanation: '',
                imageUrl: '',
                active: true,
              });
              setQuestionModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Question</span>
          </button>
        )}

        {activeTab === 'daily' && (
          <button
            type="button"
            onClick={() => setDailyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Daily Challenge</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-[var(--accent-cyan)] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6">
        {[
          { id: 'questions', label: `Question Bank (${questions.length})` },
          { id: 'daily', label: `Daily Challenges (${dailies.length})` },
          { id: 'reports', label: `Reported Errors (${reports.filter((r) => r.status === 'open').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab.id ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070F1B] border border-white/10 text-xs text-white"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#070F1B] border border-white/10 text-xs text-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#070F1B] border border-white/10 text-xs text-white uppercase"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="rounded-2xl bg-[#070F1B] border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/10 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-semibold text-white max-w-md truncate">{q.question}</td>
                    <td className="py-3 px-4 text-slate-300">{q.category}</td>
                    <td className="py-3 px-4 uppercase font-mono text-[var(--accent-cyan)]">{q.difficulty}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${q.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
                        {q.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(q);
                          setQForm({
                            category: q.category,
                            difficulty: q.difficulty,
                            type: q.type || 'multiple-choice',
                            question: q.question,
                            options: [...q.options],
                            correctIndex: q.correctIndex,
                            explanation: q.explanation,
                            imageUrl: q.imageUrl || '',
                            active: q.active,
                          });
                          setQuestionModal(true);
                        }}
                        className="p-1 rounded text-slate-300 hover:text-[var(--accent-cyan)]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 rounded text-slate-300 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY SCHEDULER */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#070F1B] border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/10 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Challenge Title</th>
                  <th className="py-3 px-4 text-center">Questions Count</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {dailies.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{d.date}</td>
                    <td className="py-3 px-4 font-semibold text-white">{d.title}</td>
                    <td className="py-3 px-4 text-center font-mono">{d.questionIds.length}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDaily(d.id)}
                        className="p-1 rounded text-slate-300 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTED ERRORS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#070F1B] border border-white/10 text-slate-400 text-xs">
                No reported question errors. All clear!
              </div>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} className="p-5 rounded-2xl bg-[#070F1B] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-bold">
                      {rep.reason}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{new Date(rep.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-400">Question:</div>
                    <div className="text-sm font-bold text-white">{rep.questionText}</div>
                  </div>
                  {rep.details && (
                    <p className="text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/5">
                      {rep.details}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs font-mono text-slate-400">Reported by: {rep.reportedByEmail}</span>
                    <div className="flex gap-2">
                      {rep.status === 'open' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateReport(rep.id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase hover:bg-emerald-500/30"
                          >
                            Mark Resolved
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateReport(rep.id, 'dismissed')}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 text-xs font-bold uppercase hover:bg-white/20"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-mono text-cyan-400 uppercase font-bold">Status: {rep.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {questionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#070F1B] border border-white/15 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-white font-display">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h3>
              <button type="button" onClick={() => setQuestionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Category</label>
                  <select
                    value={qForm.category}
                    onChange={(e) => setQForm({ ...qForm, category: e.target.value as QuizCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Difficulty</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value as QuizDifficulty })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white uppercase"
                  >
                    <option value="easy">Easy (10 pts)</option>
                    <option value="medium">Medium (15 pts)</option>
                    <option value="hard">Hard (20 pts)</option>
                    <option value="expert">Expert (30 pts)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Question Text</label>
                <textarea
                  rows={2}
                  value={qForm.question}
                  onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold block text-slate-300">Answer Options (Select Correct Answer)</label>
                {qForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qForm.correctIndex === idx}
                      onChange={() => setQForm({ ...qForm, correctIndex: idx })}
                      className="accent-[var(--accent-cyan)] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...qForm.options];
                        next[idx] = e.target.value;
                        setQForm({ ...qForm, options: next });
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Explanation</label>
                <textarea
                  rows={2}
                  value={qForm.explanation}
                  onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] font-extrabold uppercase"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Daily Modal */}
      {dailyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#070F1B] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-white font-display">Schedule Daily Challenge</h3>
              <button type="button" onClick={() => setDailyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleScheduleDaily} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Challenge Date</label>
                <input
                  type="date"
                  value={dailyForm.date}
                  onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Challenge Title</label>
                <input
                  type="text"
                  value={dailyForm.title}
                  onChange={(e) => setDailyForm({ ...dailyForm, title: e.target.value })}
                  placeholder="e.g., Daily Masterclass #14"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Question Count</label>
                <select
                  value={dailyForm.questionCount}
                  onChange={(e) => setDailyForm({ ...dailyForm, questionCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/10 text-white"
                >
                  <option value={8}>8 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={12}>12 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDailyModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] font-extrabold uppercase"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
