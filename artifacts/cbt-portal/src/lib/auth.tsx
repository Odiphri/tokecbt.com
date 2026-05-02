import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import type { UserInfo } from "@workspace/api-client-react";
import { useLocation } from "wouter";

setAuthTokenGetter(() => {
  return localStorage.getItem("cbt_token");
});

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  login: (token: string, userData: UserInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const { data: me, isLoading: isMeLoading, error } = useGetMe({
    query: { retry: false } as any,
  });

  useEffect(() => {
    if (!isMeLoading) {
      if (me && !error) {
        setUser(me);
      } else {
        setUser(null);
        localStorage.removeItem("cbt_token");
      }
      setIsLoading(false);
    }
  }, [me, error, isMeLoading]);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!user) return;
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { logout(); }, 30 * 60 * 1000);
    };

    resetTimer();
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [user]);

  const login = (token: string, userData: UserInfo) => {
    localStorage.setItem("cbt_token", token);
    setUser(userData);
    if (userData.isDefaultPassword && userData.role !== "admin") {
      setLocation("/change-password");
    } else if (userData.role === "student") {
      setLocation("/student/dashboard");
    } else if (userData.role === "staff") {
      setLocation("/teacher/dashboard");
    } else {
      setLocation("/admin/dashboard");
    }
  };

  const logout = () => {
    localStorage.removeItem("cbt_token");
    setUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
