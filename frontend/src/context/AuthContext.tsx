import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { AuthApi } from "../api/endpoints";
import { api, setAccessToken } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      // Attempt a silent refresh using the httpOnly cookie set at login.
      const res = await api.post("/auth/refresh");
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (emailOrUsername: string, password: string) => {
    const res = await AuthApi.login({ emailOrUsername, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const signup = async (username: string, email: string, password: string) => {
    const res = await AuthApi.signup({ username, email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AuthApi.logout();
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await AuthApi.me();
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
