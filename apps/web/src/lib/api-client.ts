import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'qvanta_token';
const REFRESH_TOKEN_KEY = 'qvanta_refresh_token';

const PUBLIC_ROUTES = ['/login', '/register', '/auth/google/callback'];

let _redirectInProgress = false;

const isOnPublicRoute = (): boolean => {
  if (typeof window === 'undefined') return true;
  const path = window.location.pathname;
  return PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
};

const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('qvanta_user');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined' || _redirectInProgress) return;
  if (isOnPublicRoute()) return;
  _redirectInProgress = true;
  clearAuthStorage();
  const current = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${current}`;
};

const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setAccessToken = (token: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

const setRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      const payload = refreshToken ? { refreshToken } : {};
      const response = await axios.post<{ accessToken: string; refreshToken?: string }>(
        '/api/auth/refresh',
        payload,
        {
          baseURL: '',
          withCredentials: true,
        }
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      setAccessToken(accessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      return accessToken;
    } catch (err) {
      clearAuthStorage();
      redirectToLogin();
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        redirectToLogin();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export { clearAuthStorage, getAccessToken, setAccessToken, setRefreshToken };
