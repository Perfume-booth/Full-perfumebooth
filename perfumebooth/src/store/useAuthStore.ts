import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  hasVisited: boolean;
  setHasVisited: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasVisited: false,
      setHasVisited: (value) => set({ hasVisited: value }),
      isLoading: false,
      setIsLoading: (value) => set({ isLoading: value }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: "perfume-booth-auth-ui",
      partialize: (state) => ({ hasVisited: state.hasVisited }), // Only persist hasVisited
    }
  )
);
