import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isPending: boolean;
  canEdit: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (data: { credential?: string; email?: string; name?: string; picture?: string; google_id?: string }) => Promise<{ needs_onboarding?: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pastoral_auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (err: any) {
      // Only clear session if token is explicitly invalid or expired (401 or 403)
      // Never log out on temporary 500 server errors or connection glitches
      if (err?.status === 401 || err?.status === 403) {
        localStorage.removeItem('pastoral_auth_token');
        setToken(null);
        setUser(null);
      } else {
        console.warn('Aviso: Falha temporária ao sincronizar perfil do usuário (mantendo sessão ativa):', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('pastoral_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const loginWithGoogle = async (data: { credential?: string; email?: string; name?: string; picture?: string; google_id?: string }) => {
    const res = await api.loginWithGoogle(data);
    localStorage.setItem('pastoral_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return { needs_onboarding: res.needs_onboarding };
  };

  const logout = () => {
    localStorage.removeItem('pastoral_auth_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'coordenador';
  const isCoordinator = user?.role === 'coordenador' || user?.role === 'admin';
  const isPending = user?.role === 'pendente';
  const canEdit = isCoordinator || user?.role === 'delegado';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isCoordinator,
        isPending,
        canEdit,
        login,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
