import axios from 'axios';

// ─── Environment-aware base URL ───────────────────────────────────────────────
// In production build, set VITE_API_URL env variable.
// Falls back to localhost for local development.
const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── Friendly error messages ────────────────────────────────────────────────
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Please check the information you entered.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: 'The requested resource was not found.',
  409: 'An account with this email already exists.',
  422: 'Please check the information you entered.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again shortly.',
  502: 'WertBot services are temporarily unavailable.',
  503: 'WertBot is under maintenance. Please check back soon.',
};

export function friendlyError(error: any): string {
  if (!error.response) {
    return "Can't connect to WertBot. Check your internet connection.";
  }
  const status: number = error.response?.status;
  const serverMsg: string = error.response?.data?.message;
  // Prefer specific server message for 4xx (user-actionable), else use our map
  if (status < 500 && serverMsg && typeof serverMsg === 'string' && serverMsg.length < 120) {
    return serverMsg;
  }
  return HTTP_ERROR_MESSAGES[status] || 'An unexpected error occurred. Please try again.';
}

// ─── Token helpers ─────────────────────────────────────────────────────────
function getAccessToken() {
  return sessionStorage.getItem('wertbot_access_token') || localStorage.getItem('wertbot_access_token');
}
function getRefreshToken() {
  return sessionStorage.getItem('wertbot_refresh_token') || localStorage.getItem('wertbot_refresh_token');
}
function setTokens(access: string, refresh: string, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem('wertbot_access_token', access);
  store.setItem('wertbot_refresh_token', refresh);
}
export function clearSession() {
  ['wertbot_access_token', 'wertbot_refresh_token', 'wertbot_user_email'].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ─── Axios instance ──────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor — attach Bearer token ───────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — auto-refresh on 401 ──────────────────────────────
let _isRefreshing = false;
let _pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  _pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  _pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh on the refresh endpoint itself
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    _isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = res.data;

      // Preserve remember-me preference
      const remember = !!localStorage.getItem('wertbot_access_token');
      setTokens(accessToken, newRefresh ?? refreshToken, remember);

      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSession();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  },
);

// Export setTokens for use by LoginPage
export { setTokens };
