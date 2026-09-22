import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken } from '../api/client';
import type { LoginRequest, RegisterRequest } from '../api/types';
import { decodeJwt } from './jwt';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isStaff: boolean;
  isAdmin: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'helpdesk.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw) as AuthUser;
    const { exp } = decodeJwt(user.token);
    if (Date.now() >= exp * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = loadStoredUser();
    setAuthToken(stored?.token ?? null);
    return stored;
  });

  useEffect(() => {
    setAuthToken(user?.token ?? null);
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('helpdesk:unauthorized', logout);
    return () => window.removeEventListener('helpdesk:unauthorized', logout);
  }, [logout]);

  const applyAuthResponse = useCallback(
    (response: { token: string; email: string; displayName: string; roles: string[] }) => {
      const { sub } = decodeJwt(response.token);
      const authUser: AuthUser = {
        id: sub,
        email: response.email,
        displayName: response.displayName,
        roles: response.roles,
        token: response.token,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
    },
    [],
  );

  const login = useCallback(
    async (payload: LoginRequest) => applyAuthResponse(await api.login(payload)),
    [applyAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => applyAuthResponse(await api.register(payload)),
    [applyAuthResponse],
  );

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? [];
    return {
      user,
      isStaff: roles.includes('Agent') || roles.includes('Admin'),
      isAdmin: roles.includes('Admin'),
      login,
      register,
      logout,
    };
  }, [user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
