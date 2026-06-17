import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useContext, useEffect, useState } from "react";

import type { VaultUser } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricVerified: boolean;
  biometricAvailable: boolean;
  user: VaultUser | null;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  login: (user: VaultUser) => Promise<void>;
  logout: () => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
  skipBiometric: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  biometricVerified: false,
  biometricAvailable: false,
  user: null,
  pendingPhone: "",
  setPendingPhone: () => {},
  login: async () => {},
  logout: async () => {},
  verifyBiometric: async () => false,
  skipBiometric: () => {},
});

const USER_KEY = "@vault_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VaultUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(USER_KEY),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
      .then(([raw, hasHW, isEnrolled]) => {
        if (raw) setUser(JSON.parse(raw) as VaultUser);
        setBiometricAvailable(hasHW && isEnrolled);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (u: VaultUser) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    setBiometricVerified(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setBiometricVerified(false);
  };

  const verifyBiometric = async (): Promise<boolean> => {
    if (!biometricAvailable) {
      setBiometricVerified(true);
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Vault",
        fallbackLabel: "Use PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setBiometricVerified(true);
        return true;
      }
      return false;
    } catch {
      setBiometricVerified(true);
      return true;
    }
  };

  const skipBiometric = () => setBiometricVerified(true);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        biometricVerified,
        biometricAvailable,
        user,
        pendingPhone,
        setPendingPhone,
        login,
        logout,
        verifyBiometric,
        skipBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
