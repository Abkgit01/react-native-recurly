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

type PendingVerification = {
  fullName: string;
  email: string;
  phoneNumber: string;
};

type AuthSessionContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  token: string | null;
  user: AuthUser | null;
  pendingVerification: PendingVerification | null;
  pendingPassword: string | null;
  saveLoginSession: (loginResponse: LoginResponse) => Promise<void>;
  savePendingVerification: (
    pending: PendingVerification,
    password?: string,
  ) => Promise<void>;
  clearPendingVerification: () => Promise<void>;
  clearAuthSession: () => Promise<void>;
};

const SESSION_STORAGE_KEY = "electionapp.auth.session";
const PENDING_VERIFICATION_STORAGE_KEY = "electionapp.auth.pendingVerification";
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
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        const pendingValue = await SecureStore.getItemAsync(
          PENDING_VERIFICATION_STORAGE_KEY,
        );
        if (!mounted) return;
        if (value) setSession(JSON.parse(value) as StoredSession);
        if (pendingValue) {
          setPendingVerification(
            JSON.parse(pendingValue) as PendingVerification,
          );
        }
      } catch {
        if (mounted) {
          setSession(null);
          setPendingVerification(null);
        }
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

  const savePendingVerification = useCallback(
    async (pending: PendingVerification, password?: string) => {
      await SecureStore.setItemAsync(
        PENDING_VERIFICATION_STORAGE_KEY,
        JSON.stringify(pending),
      );
      setPendingVerification(pending);
      setPendingPassword(password ?? null);
    },
    [],
  );

  const clearPendingVerification = useCallback(async () => {
    await SecureStore.deleteItemAsync(PENDING_VERIFICATION_STORAGE_KEY);
    setPendingVerification(null);
    setPendingPassword(null);
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
      pendingVerification,
      pendingPassword,
      saveLoginSession,
      savePendingVerification,
      clearPendingVerification,
      clearAuthSession,
    }),
    [
      clearAuthSession,
      clearPendingVerification,
      isLoaded,
      pendingPassword,
      pendingVerification,
      saveLoginSession,
      savePendingVerification,
      session,
    ],
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
