import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import type { VaultUser } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: VaultUser | null;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  login: (user: VaultUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  pendingPhone: "",
  setPendingPhone: () => {},
  login: async () => {},
  logout: async () => {},
});

const USER_KEY = "@vault_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VaultUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as VaultUser;
          setUser(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (u: VaultUser) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        pendingPhone,
        setPendingPhone,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
