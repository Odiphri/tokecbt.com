import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import type { UserInfo } from "@workspace/api-client-react";
import { useLocation } from "wouter";

// Configure token getter for API client
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
    query: {
      retry: false,
    }
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
      timeoutId = setTimeout(() => {
        logout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const login = (token: string, userData: UserInfo) => {
    localStorage.setItem("cbt_token", token);
    setUser(userData);
    if (userData.isDefaultPassword) {
      setLocation("/change-password");
    } else if (userData.role === "student") {
      setLocation("/student/dashboard");
    } else {
      setLocation("/teacher/dashboard");
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
