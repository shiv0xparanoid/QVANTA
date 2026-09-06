import { create } from 'zustand';

interface UIState {
  lite2DMode: boolean;
  sidebarOpen: boolean;
  toggleLite2D: () => void;
  setLite2D: (value: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;
}

const LITE_2D_KEY = 'qvanta_lite_2d';

const loadLite2DInitial = (): boolean => {
  try {
    const stored = localStorage.getItem(LITE_2D_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch {
    // ignore
  }
  return false;
};

export const useUIStore = create<UIState>((set, get) => ({
  lite2DMode: loadLite2DInitial(),
  sidebarOpen: false,

  toggleLite2D: () => {
    const next = !get().lite2DMode;
    try {
      localStorage.setItem(LITE_2D_KEY, String(next));
    } catch {
      // ignore
    }
    set({ lite2DMode: next });
  },

  setLite2D: (value: boolean) => {
    try {
      localStorage.setItem(LITE_2D_KEY, String(value));
    } catch {
      // ignore
    }
    set({ lite2DMode: value });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (value: boolean) => {
    set({ sidebarOpen: value });
  }
}));
