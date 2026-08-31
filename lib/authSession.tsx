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

import {
  ApiRequestError,
  getAgentDashboard,
  setUnauthorizedHandler,
  type AgentDashboardResponse,
  type LoginResponse,
} from "./authApi";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

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

type AuthRoute = "/(auth)/otp" | "/kyc-submission" | "/(tabs)";

type PendingVerification = {
  fullName: string;
  email: string;
  phoneNumber: string;
};

type AuthSessionContextValue = {
  status: AuthStatus;
  isLoaded: boolean;
  isSignedIn: boolean;
  token: string | null;
  user: AuthUser | null;
  restoredDashboard: AgentDashboardResponse | null;
  pendingVerification: PendingVerification | null;
  saveLoginSession: (loginResponse: LoginResponse) => Promise<AuthRoute>;
  savePendingVerification: (pending: PendingVerification) => Promise<void>;
  clearPendingVerification: () => Promise<void>;
  clearAuthSession: () => Promise<void>;
  getPostAuthRoute: () => AuthRoute;
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

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = atob(padded);

    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
};

const isJwtExpired = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 <= Date.now();
};

const routeForAccount = (
  session: StoredSession,
  dashboard: AgentDashboardResponse | null,
): AuthRoute => {
  if (!session.user.phoneNumberConfirmed) return "/(auth)/otp";
  if (dashboard && !dashboard.kycApproved) return "/kyc-submission";
  return "/(tabs)";
};

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [restoredDashboard, setRestoredDashboard] =
    useState<AgentDashboardResponse | null>(null);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");

  const clearAuthSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSession(null);
    setRestoredDashboard(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        const pendingValue = await SecureStore.getItemAsync(
          PENDING_VERIFICATION_STORAGE_KEY,
        );
        if (!mounted) return;
        if (pendingValue) {
          setPendingVerification(
            JSON.parse(pendingValue) as PendingVerification,
          );
        }

        if (!value) {
          setSession(null);
          setRestoredDashboard(null);
          setStatus("unauthenticated");
          return;
        }

        const nextSession = JSON.parse(value) as StoredSession;
        if (!nextSession.token || isJwtExpired(nextSession.token)) {
          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
          setSession(null);
          setRestoredDashboard(null);
          setStatus("unauthenticated");
          return;
        }

        try {
          const dashboard = await getAgentDashboard(nextSession.token);
          if (!mounted) return;
          setSession(nextSession);
          setRestoredDashboard(dashboard);
          setStatus("authenticated");
        } catch (error) {
          if (!mounted) return;
          if (error instanceof ApiRequestError && error.status === 403) {
            setSession(nextSession);
            setRestoredDashboard(null);
            setStatus("authenticated");
            return;
          }

          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
          setSession(null);
          setRestoredDashboard(null);
          setStatus("unauthenticated");
        }
      } catch {
        if (mounted) {
          setSession(null);
          setPendingVerification(null);
          setRestoredDashboard(null);
          setStatus("unauthenticated");
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearAuthSession();
    });

    return () => setUnauthorizedHandler(null);
  }, [clearAuthSession]);

  const saveLoginSession = useCallback(async (loginResponse: LoginResponse) => {
    const nextSession = toStoredSession(loginResponse);
    let dashboard: AgentDashboardResponse | null = null;

    if (nextSession.user.phoneNumberConfirmed) {
      dashboard = await getAgentDashboard(nextSession.token).catch((error) => {
        if (error instanceof ApiRequestError && error.status === 401) {
          throw error;
        }

        return null;
      });
    }

    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(nextSession),
    );
    setSession(nextSession);
    setRestoredDashboard(dashboard);
    setStatus("authenticated");
    return routeForAccount(nextSession, dashboard);
  }, []);

  const savePendingVerification = useCallback(async (pending: PendingVerification) => {
    await SecureStore.setItemAsync(
      PENDING_VERIFICATION_STORAGE_KEY,
      JSON.stringify(pending),
    );
    setPendingVerification(pending);
  }, []);

  const clearPendingVerification = useCallback(async () => {
    await SecureStore.deleteItemAsync(PENDING_VERIFICATION_STORAGE_KEY);
    setPendingVerification(null);
  }, []);

  const getPostAuthRoute = useCallback(
    () => (session ? routeForAccount(session, restoredDashboard) : "/(tabs)"),
    [restoredDashboard, session],
  );

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      status,
      isLoaded: status !== "initializing",
      isSignedIn: status === "authenticated" && Boolean(session?.token),
      token: session?.token ?? null,
      user: session?.user ?? null,
      restoredDashboard,
      pendingVerification,
      saveLoginSession,
      savePendingVerification,
      clearPendingVerification,
      clearAuthSession,
      getPostAuthRoute,
    }),
    [
      clearAuthSession,
      clearPendingVerification,
      getPostAuthRoute,
      pendingVerification,
      restoredDashboard,
      saveLoginSession,
      savePendingVerification,
      session,
      status,
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
