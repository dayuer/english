import { create } from 'zustand';

export type DiagnosticStore = {
  questions: any[];
  currentIndex: number;
  currentElapsed: number;
  timerInterval: NodeJS.Timeout | null;
  correctCount: number;
  totalTime: number;

  setQuestions: (q: any[]) => void;
  startTimer: () => void;
  stopTimer: () => void;
  recordAnswer: (correct: boolean) => void;
  nextQuestion: () => boolean;
  reset: () => void;
  getResults: () => { accuracy: number; avgTime: number; correctCount: number; totalQuestions: number };
};

export const useDiagnosticStore = create<DiagnosticStore>((set, get) => ({
  questions: [],
  currentIndex: 0,
  currentElapsed: 0,
  timerInterval: null,
  correctCount: 0,
  totalTime: 0,

  setQuestions: (q) => set({ questions: q }),
  
  startTimer: () => {
    const interval = setInterval(() => {
      set((state) => ({ currentElapsed: state.currentElapsed + 0.1 }));
    }, 100);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    set({ timerInterval: null });
  },

  recordAnswer: (correct: boolean) => {
    set((state) => ({
      correctCount: state.correctCount + (correct ? 1 : 0),
      totalTime: state.totalTime + state.currentElapsed
    }));
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex + 1 < questions.length) {
      set({ currentIndex: currentIndex + 1, currentElapsed: 0 });
      return true;
    }
    return false;
  },

  reset: () => {
    const { timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    set({
      questions: [],
      currentIndex: 0,
      currentElapsed: 0,
      timerInterval: null,
      correctCount: 0,
      totalTime: 0,
    });
  },

  getResults: () => {
    const { correctCount, totalTime, questions } = get();
    const total = questions.length || 1;
    return {
      accuracy: Math.round((correctCount / total) * 100),
      avgTime: Number((totalTime / total).toFixed(1)),
      correctCount,
      totalQuestions: total,
    };
  }
}));
