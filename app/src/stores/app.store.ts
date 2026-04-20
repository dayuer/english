import { create } from 'zustand';

interface UserProfile {
  name: string;
  level: string;
  chunks: number;
  connections: number;
  scenes: number;
  streak: number;
  days: number;
  overallProgress: number; // 0 to 100
}

interface AppState {
  profile: UserProfile;
  setProfile: (data: Partial<UserProfile>) => void;
}

// Mock Data representing "Good morning, User" level 3
export const useAppStore = create<AppState>((set) => ({
  profile: {
    name: 'Learner',
    level: 'B1',
    chunks: 42,
    connections: 12,
    scenes: 7,
    streak: 7,
    days: 12,
    overallProgress: 65,
  },
  setProfile: (data) => set((state) => ({ profile: { ...state.profile, ...data } })),
}));
