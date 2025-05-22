import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, login as authLogin, logout as authLogout, getStoredUser } from "@/lib/auth";

interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If we have a user in localStorage, use that directly
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const user = await authLogin(username, password);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
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
