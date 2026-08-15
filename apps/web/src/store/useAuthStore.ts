import { useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
}

export function useAuthStore(selector?: (state: any) => any) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('wertbot_user');
      return stored ? JSON.parse(stored) : { id: 'usr_demo_1', email: 'user@wertbot.io', fullName: 'WertBot User' };
    } catch {
      return { id: 'usr_demo_1', email: 'user@wertbot.io', fullName: 'WertBot User' };
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('wertbot_token') || 'demo_token';
  });

  const login = (userData: UserProfile, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('wertbot_user', JSON.stringify(userData));
    localStorage.setItem('wertbot_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('wertbot_user');
    localStorage.removeItem('wertbot_token');
  };

  const state = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return selector ? selector(state) : state;
}
