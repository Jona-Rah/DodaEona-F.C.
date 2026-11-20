export type QuizCategory =
  | 'Football History'
  | 'FIFA World Cup'
  | 'UEFA Champions League'
  | 'European Leagues'
  | 'Clubs and Their History'
  | 'Legendary Players'
  | 'Current Football Players'
  | 'Managers and Coaches'
  | 'International Football'
  | 'Football Records and Statistics'
  | 'Transfers and Contracts'
  | 'Football Rules and Regulations'
  | 'Stadiums and Competitions'
  | 'Difficult Football Trivia';

export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type QuizGameMode =
  | 'quick'
  | 'classic'
  | 'survival'
  | 'time'
  | 'daily'
  | 'category';

export interface QuizQuestionItem {
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  type: 'multiple-choice' | 'true-false' | 'image';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface QuizAttemptRecord {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  mode: QuizGameMode;
  category?: QuizCategory;
  score: number;
  maxPossibleScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalQuestions: number;
  accuracy: number;
  timeTakenSec: number;
  rating: 'Perfect' | 'Elite' | 'Sharp' | 'Solid' | 'Developing' | 'Rookie' | 'Unrated';
  difficultyBreakdown: Record<QuizDifficulty, { correct: number; total: number }>;
  questionsAnswered: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    selectedIndex: number;
    isCorrect: boolean;
    explanation: string;
    timeTakenSec: number;
  }>;
  unlockedAchievements: string[];
  submittedAt: string;
}

export interface QuizAchievementDefinition {
  id: string;
  title: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  icon: string;
  condition: string;
}

export interface QuizDailyScheduleRecord {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  questionIds: string[];
  active: boolean;
  createdAt: string;
}

export interface QuizReportRecord {
  id: string;
  questionId: string;
  questionText: string;
  reportedByEmail: string;
  reason: 'Incorrect Answer' | 'Outdated Information' | 'Unclear Wording' | 'Typographical Error' | 'Other';
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}
