import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { VaultUser } from "@/types";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const ACCESS_TOKEN_KEY = "vault_access_token";
const REFRESH_TOKEN_KEY = "vault_refresh_token";
const USER_KEY = "vault_user";

interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  kycStatus: string;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function toVaultUser(authUser: AuthUser): VaultUser {
  return {
    id: authUser.id,
    name: authUser.name ?? "",
    phone: authUser.phone,
    balance: 0,
    upiLite: 0,
  };
}

const API_PORT = 3001;

function apiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}/api${path}`;
  console.log(`[apiFetch] ${init?.method ?? "GET"} ${url}`);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    let message: string;
    try {
      message = JSON.parse(body).error ?? body;
    } catch {
      message = body;
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: Bearer ${token}`
    },
  });
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricVerified: boolean;
  biometricAvailable: boolean;
  user: VaultUser | null;
  authUser: AuthUser | null;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  refreshAuth: () => Promise<boolean>;
  updateUser: (updates: { name?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  biometricVerified: false,
  biometricAvailable: false,
  user: null,
  authUser: null,
  pendingPhone: "",
  setPendingPhone: () => {},
  sendOtp: async () => {},
  verifyOtp: async () => {},
  logout: async () => {},
  verifyBiometric: async () => false,
  validateSession: async () => false,
  refreshAuth: async () => false,
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const refreshPromise = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      } catch {
        return null;
      }
    });
  }, []);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const [token, rawUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);

      if (rawUser) {
        const parsed = JSON.parse(rawUser) as AuthUser;
        setAuthUser(parsed);
      }

      if (token) {
        const valid = await validateSessionToken(token);
        if (!valid) {
          const refreshed = await refreshAuth();
          if (!refreshed) {
            await clearAuth();
          }
        }
      } else {
        const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (stored) {
          const refreshed = await refreshAuth();
          if (!refreshed) {
            await clearAuth();
          }
        }
      }
    } catch {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  }

  async function validateSessionToken(token: string): Promise<boolean> {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    setAuthUser(data.user);
    setBiometricVerified(true);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch {
      return false;
    }
  }

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    if (refreshPromise.current) return refreshPromise.current;

    refreshPromise.current = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        const data = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);

        const valid = await validateSessionToken(data.accessToken);
        return valid;
      } catch {
        return false;
      } finally {
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  async function clearAuth() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setAuthUser(null);
    setBiometricVerified(false);
  }

  const sendOtp = useCallback(async (phone: string) => {
    await apiFetch<{ message: string; expiresIn: number }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const data = await apiFetch<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user)),
    ]);

    setAuthUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) {
        await apiFetch("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      await clearAuth();
    }
  }, []);

  const verifyBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const [hasHW, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricAvailable(hasHW && isEnrolled);

      if (!hasHW || !isEnrolled) {
        setBiometricVerified(true);
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Vault",
        fallbackLabel: "Use Passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (!result.success) return false;

      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!token) {
        const refreshed = await refreshAuth();
        if (!refreshed) return false;
      } else {
        const valid = await validateSessionToken(token);
        if (!valid) {
          const refreshed = await refreshAuth();
          if (!refreshed) return false;
        }
      }

      setBiometricVerified(true);
      return true;
    } catch {
      return false;
    }
  }, [refreshAuth]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) return false;
    return validateSessionToken(token);
  }, []);

  const updateUser = useCallback(async (updates: { name?: string; email?: string }) => {
    const data = await authedFetch<{ user: AuthUser }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    setAuthUser(data.user);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!authUser,
        isLoading,
        biometricVerified,
        biometricAvailable,
        user: authUser ? toVaultUser(authUser) : null,
        authUser,
        pendingPhone,
        setPendingPhone,
        sendOtp,
        verifyOtp,
        logout,
        verifyBiometric,
        validateSession,
        refreshAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
