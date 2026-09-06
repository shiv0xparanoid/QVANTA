import { create } from 'zustand';
import type { User } from '@qvanta/types';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const USER_KEY = 'qvanta_user';
const TOKEN_KEY = 'qvanta_token';
const REFRESH_KEY = 'qvanta_refresh_token';

const loadInitialState = (): Partial<AuthState> => {
  try {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const mockUser: User = {
        id: 'dev-local',
        email: 'dev@qvanta.ai',
        role: 'admin',
        tier: 'free',
        usageMonth: new Date().toISOString().slice(0, 7),
        usageSims: 0,
        avatarPreset: 0,
        createdAt: new Date().toISOString(),
      };
      const tokens: AuthTokens = {
        accessToken: 'dev-token',
        refreshToken: 'dev-refresh',
      };
      try {
        localStorage.setItem(TOKEN_KEY, tokens.accessToken);
        if (typeof tokens.refreshToken === 'string' && tokens.refreshToken.length > 0) {
          localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      } catch {
        /* ignore */
      }
      return {
        user: mockUser,
        tokens,
        isAuthenticated: true,
      };
    }

    if (!accessToken) {
      return { user: null, tokens: null, isAuthenticated: false };
    }

    const user = userStr ? (JSON.parse(userStr) as User) : null;
    const tokens: AuthTokens = { accessToken };
    if (refreshToken) {
      tokens.refreshToken = refreshToken;
    }

    return {
      user,
      tokens,
      isAuthenticated: !!accessToken
    };
  } catch {
    return { user: null, tokens: null, isAuthenticated: false };
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  const initial = loadInitialState();

  return {
    user: initial.user ?? null,
    tokens: initial.tokens ?? null,
    isAuthenticated: initial.isAuthenticated ?? false,

    setAuth: (user: User, tokens: AuthTokens) => {
      try {
        localStorage.setItem(TOKEN_KEY, tokens.accessToken);
        if (typeof tokens.refreshToken === 'string' && tokens.refreshToken.length > 0) {
          localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // ignore persistence errors
      }
      set({ user, tokens, isAuthenticated: true });
    },

    setUser: (user: User) => {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
      set({ user });
    },

    logout: () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {
        // ignore
      }
      set({ user: null, tokens: null, isAuthenticated: false });
    }
  };
});
