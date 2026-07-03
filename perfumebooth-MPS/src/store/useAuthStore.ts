import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  setAuth: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    {
      name: 'perfumebooth-admin-auth',
    }
  )
);

