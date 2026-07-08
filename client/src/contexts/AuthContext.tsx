import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

export interface AuthUser {
  userId: number;
  employeeId: number;
  employeeName: string;
  unitId: number;
  districtId: number;
  rankId: number;
  roleId: number;
  roleName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {}
});

/**
 * Resolves the officer's application profile once Catalyst's embedded
 * authentication has completed a login. In production, Catalyst's Web
 * SDK (initialized in index.html per the platform's embedded-auth
 * setup) manages the actual login UI/session; this context only
 * fetches the resulting profile from our own /auth/me endpoint.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await authApi.me();
      setUser(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
