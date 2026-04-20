import { create } from 'zustand';

export interface LessonFragment {
  id: string;
  text: string;
  used: boolean;
}

interface Exercise {
  type: string;
  instruction?: string;
  prompt: string;
  l1?: string;
  targetChunk?: string;
  answer: string[];
  interferenceOptions: string[];
}

interface LessonState {
  lessonId: string | null;
  progress: number;
  exercises: Exercise[];
  exerciseIndex: number;
  // Current exercise view state
  prompt: string;
  answerPool: LessonFragment[];
  selectedFragments: string[];
  feedback: 'idle' | 'correct' | 'wrong';
  shadowingVerdict: 'idle' | 'good' | 'poor' | 'skip';
  isRecording: boolean;

  loadExercises: (lessonId: string, exercises: Exercise[]) => void;
  selectFragment: (id: string) => void;
  unselectFragment: (id: string) => void;
  checkAnswer: (correctSequence: string[]) => void;
  setShadowingState: (verdict: 'idle' | 'good' | 'poor' | 'skip', isRecording?: boolean) => void;
  nextQuestion: () => boolean;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  lessonId: null,
  progress: 0,
  exercises: [],
  exerciseIndex: 0,
  prompt: '',
  answerPool: [],
  selectedFragments: [],
  feedback: 'idle',
  shadowingVerdict: 'idle',
  isRecording: false,

  loadExercises: (lessonId, exercises) => {
    if (exercises.length === 0) return;
    const first = exercises[0];
    const allFrags = [...first.answer, ...(first.interferenceOptions || [])];
    set({
      lessonId,
      exercises,
      exerciseIndex: 0,
      progress: 0,
      prompt: first.prompt,
      answerPool: allFrags.map((f, i) => ({ id: String(i), text: f, used: false })),
      selectedFragments: [],
      feedback: 'idle',
      shadowingVerdict: 'idle',
      isRecording: false,
    });
  },



  selectFragment: (id) => {
    const { answerPool, selectedFragments } = get();
    if (!answerPool.find((f) => f.id === id)?.used) {
      set({
        selectedFragments: [...selectedFragments, id],
        answerPool: answerPool.map((f) => (f.id === id ? { ...f, used: true } : f)),
      });
    }
  },

  unselectFragment: (id) => {
    const { answerPool, selectedFragments } = get();
    set({
      selectedFragments: selectedFragments.filter((fid) => fid !== id),
      answerPool: answerPool.map((f) => (f.id === id ? { ...f, used: false } : f)),
    });
  },

  checkAnswer: (correctSequence) => {
    const { selectedFragments, answerPool, exercises, exerciseIndex } = get();
    const currentSequence = selectedFragments.map((id) => answerPool.find((f) => f.id === id)?.text);
    
    // 严格数组相等比较，防止由于 join 隐藏了底层数据粒度问题
    const isCorrect = currentSequence.length === correctSequence.length && 
                      currentSequence.every((val, index) => val === correctSequence[index]);

    if (isCorrect) {
      const newProgress = Math.min(((exerciseIndex + 1) / exercises.length) * 100, 100);
      set({ feedback: 'correct', progress: newProgress });
    } else if (selectedFragments.length > 0) {
      set({ feedback: 'wrong' });
    }
  },

  setShadowingState: (verdict, isRecording) => {
    set((state) => ({
      shadowingVerdict: verdict,
      isRecording: isRecording !== undefined ? isRecording : state.isRecording,
    }));
  },

  nextQuestion: () => {
    const { exercises, exerciseIndex } = get();
    const nextIdx = exerciseIndex + 1;
    if (nextIdx >= exercises.length) return false;

    const next = exercises[nextIdx];
    const allFrags = [...next.answer, ...(next.interferenceOptions || [])];

    set({
      exerciseIndex: nextIdx,
      prompt: next.prompt,
      answerPool: allFrags.map((f, i) => ({ id: String(i), text: f, used: false })),
      selectedFragments: [],
      feedback: 'idle',
      shadowingVerdict: 'idle',
      isRecording: false,
    });
    return true;
  },
}));
