import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LoginResponse } from "./authApi";

type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  phoneNumberConfirmed: boolean;
  accountStatus: string;
  roles: string[];
};

type StoredSession = {
  token: string;
  user: AuthUser;
};

type AuthSessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  token: string | null;
  user: AuthUser | null;
  saveLoginSession: (loginResponse: LoginResponse) => Promise<void>;
  clearAuthSession: () => Promise<void>;
};

const SESSION_STORAGE_KEY = "electionapp.auth.session";
const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const toStoredSession = (loginResponse: LoginResponse): StoredSession => ({
  token: loginResponse.token,
  user: {
    id: loginResponse.userId,
    fullName: loginResponse.fullName,
    email: loginResponse.email,
    phoneNumber: loginResponse.phoneNumber,
    phoneNumberConfirmed: loginResponse.phoneNumberConfirmed,
    accountStatus: loginResponse.accountStatus,
    roles: loginResponse.roles,
  },
});

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (!mounted || !value) return;
        setSession(JSON.parse(value) as StoredSession);
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const saveLoginSession = useCallback(async (loginResponse: LoginResponse) => {
    const nextSession = toStoredSession(loginResponse);
    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(nextSession),
    );
    setSession(nextSession);
  }, []);

  const clearAuthSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      isLoaded,
      isSignedIn: Boolean(session?.token),
      token: session?.token ?? null,
      user: session?.user ?? null,
      saveLoginSession,
      clearAuthSession,
    }),
    [clearAuthSession, isLoaded, saveLoginSession, session],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }

  return context;
};
