import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import {
  ApiRequestError,
  getAgentDashboard,
  isAuthenticationApiError,
  isTransientApiError,
  setUnauthorizedHandler,
  type AgentDashboardResponse,
  type LoginResponse,
} from "./authApi";

export type AuthStatus =
  | "initializing"
  | "authenticated"
  | "authenticated_degraded"
  | "unauthenticated";

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
  dashboard?: AgentDashboardResponse | null;
  dashboardLastUpdatedAt?: string | null;
};

type AuthRoute = "/(auth)/sign-in" | "/(auth)/otp" | "/kyc-submission" | "/(tabs)";

type PendingVerification = {
  fullName: string;
  email: string;
  phoneNumber: string;
};

type RefreshDashboardOptions = {
  force?: boolean;
};

type AuthSessionContextValue = {
  status: AuthStatus;
  isLoaded: boolean;
  isSignedIn: boolean;
  isDegraded: boolean;
  token: string | null;
  user: AuthUser | null;
  dashboard: AgentDashboardResponse | null;
  restoredDashboard: AgentDashboardResponse | null;
  dashboardLastUpdatedAt: string | null;
  dashboardError: string;
  pendingVerification: PendingVerification | null;
  saveLoginSession: (loginResponse: LoginResponse) => Promise<AuthRoute>;
  savePendingVerification: (pending: PendingVerification) => Promise<void>;
  clearPendingVerification: () => Promise<void>;
  confirmPhoneNumber: () => Promise<AuthRoute>;
  refreshDashboard: (options?: RefreshDashboardOptions) => Promise<AgentDashboardResponse | null>;
  applyDashboardSnapshot: (dashboard: AgentDashboardResponse) => Promise<void>;
  clearAuthSession: () => Promise<void>;
  getPostAuthRoute: () => AuthRoute;
};

const SESSION_STORAGE_KEY = "electionapp.auth.session";
const PENDING_VERIFICATION_STORAGE_KEY = "electionapp.auth.pendingVerification";
const FOREGROUND_REFRESH_STALE_MS = 5 * 60 * 1000;
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
  dashboard: null,
  dashboardLastUpdatedAt: null,
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
  session: StoredSession | null,
  dashboard: AgentDashboardResponse | null,
): AuthRoute => {
  if (!session) return "/(auth)/sign-in";
  if (!session.user.phoneNumberConfirmed) return "/(auth)/otp";
  if (dashboard && !dashboard.kycApproved) return "/kyc-submission";
  return "/(tabs)";
};

const mergeDashboardIntoSession = (
  session: StoredSession,
  dashboard: AgentDashboardResponse,
  lastUpdatedAt: string,
): StoredSession => ({
  ...session,
  dashboard,
  dashboardLastUpdatedAt: lastUpdatedAt,
  user: {
    ...session.user,
    fullName: dashboard.fullName ?? session.user.fullName,
    email: dashboard.email ?? session.user.email,
    phoneNumber: dashboard.phoneNumber ?? session.user.phoneNumber,
    phoneNumberConfirmed:
      session.user.phoneNumberConfirmed || dashboard.isPhoneVerified,
    accountStatus: dashboard.accountStatus ?? session.user.accountStatus,
  },
});

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [dashboard, setDashboard] = useState<AgentDashboardResponse | null>(null);
  const [dashboardLastUpdatedAt, setDashboardLastUpdatedAt] =
    useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");

  const sessionRef = useRef<StoredSession | null>(null);
  const dashboardRef = useRef<AgentDashboardResponse | null>(null);
  const dashboardLastUpdatedAtRef = useRef<string | null>(null);
  const refreshPromiseRef =
    useRef<Promise<AgentDashboardResponse | null> | null>(null);

  const setSessionState = useCallback((nextSession: StoredSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const setDashboardState = useCallback(
    (
      nextDashboard: AgentDashboardResponse | null,
      nextUpdatedAt: string | null,
    ) => {
      dashboardRef.current = nextDashboard;
      dashboardLastUpdatedAtRef.current = nextUpdatedAt;
      setDashboard(nextDashboard);
      setDashboardLastUpdatedAt(nextUpdatedAt);
    },
    [],
  );

  const persistSession = useCallback(async (nextSession: StoredSession) => {
    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(nextSession),
    );
  }, []);

  const invalidateSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    setSessionState(null);
    setDashboardState(null, null);
    setDashboardError("");
    setStatus("unauthenticated");
  }, [setDashboardState, setSessionState]);

  const clearAuthSession = useCallback(async () => {
    await invalidateSession();
  }, [invalidateSession]);

  const applyDashboardSnapshot = useCallback(
    async (nextDashboard: AgentDashboardResponse) => {
      const current = sessionRef.current;
      const updatedAt = new Date().toISOString();

      setDashboardState(nextDashboard, updatedAt);
      setDashboardError("");
      if (current) {
        const nextSession = mergeDashboardIntoSession(
          current,
          nextDashboard,
          updatedAt,
        );
        setSessionState(nextSession);
        await persistSession(nextSession);
      }
      setStatus("authenticated");
    },
    [persistSession, setDashboardState, setSessionState],
  );

  const refreshDashboard = useCallback(
    async ({ force = false }: RefreshDashboardOptions = {}) => {
      const current = sessionRef.current;
      if (!current?.token) return null;

      if (!force && refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const refresh = (async () => {
        try {
          const nextDashboard = await getAgentDashboard(current.token);
          if (sessionRef.current?.token !== current.token) {
            return dashboardRef.current;
          }

          await applyDashboardSnapshot(nextDashboard);
          return nextDashboard;
        } catch (error) {
          if (sessionRef.current?.token !== current.token) {
            return dashboardRef.current;
          }

          if (isAuthenticationApiError(error)) {
            await invalidateSession();
            throw error;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Dashboard could not be synchronized.";
          setDashboardError(message);

          if (isTransientApiError(error)) {
            setStatus("authenticated_degraded");
            return dashboardRef.current;
          }

          if (error instanceof ApiRequestError && error.category === "authorization") {
            setStatus("authenticated");
            return dashboardRef.current;
          }

          throw error;
        } finally {
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = refresh;
      return refresh;
    },
    [applyDashboardSnapshot, invalidateSession],
  );

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
          setSessionState(null);
          setDashboardState(null, null);
          setStatus("unauthenticated");
          return;
        }

        const nextSession = JSON.parse(value) as StoredSession;
        if (!nextSession.token || !nextSession.user || isJwtExpired(nextSession.token)) {
          await invalidateSession();
          return;
        }

        setSessionState(nextSession);
        setDashboardState(
          nextSession.dashboard ?? null,
          nextSession.dashboardLastUpdatedAt ?? null,
        );
        setStatus("authenticated");
        void refreshDashboard({ force: true }).catch(() => undefined);
      } catch {
        if (mounted) {
          await invalidateSession();
          setPendingVerification(null);
        }
      }
    };

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [invalidateSession, refreshDashboard, setDashboardState, setSessionState]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void invalidateSession();
    });

    return () => setUnauthorizedHandler(null);
  }, [invalidateSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      if (!sessionRef.current) return;

      const lastUpdatedAt = dashboardLastUpdatedAtRef.current;
      const isStale =
        !lastUpdatedAt ||
        Date.now() - new Date(lastUpdatedAt).getTime() >
          FOREGROUND_REFRESH_STALE_MS;

      if (isStale) {
        void refreshDashboard().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [refreshDashboard]);

  const saveLoginSession = useCallback(
    async (loginResponse: LoginResponse) => {
      const nextSession = toStoredSession(loginResponse);

      await persistSession(nextSession);
      setSessionState(nextSession);
      setDashboardState(null, null);
      setDashboardError("");
      setStatus("authenticated");

      let nextDashboard: AgentDashboardResponse | null = null;
      if (nextSession.user.phoneNumberConfirmed) {
        nextDashboard = await refreshDashboard({ force: true });
      }

      return routeForAccount(sessionRef.current, nextDashboard);
    },
    [persistSession, refreshDashboard, setDashboardState, setSessionState],
  );

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

  const confirmPhoneNumber = useCallback(async () => {
    const current = sessionRef.current;
    await SecureStore.deleteItemAsync(PENDING_VERIFICATION_STORAGE_KEY);
    setPendingVerification(null);

    if (!current) return "/(auth)/sign-in";

    const nextSession: StoredSession = {
      ...current,
      user: {
        ...current.user,
        phoneNumberConfirmed: true,
      },
    };

    await persistSession(nextSession);
    setSessionState(nextSession);
    setStatus("authenticated");

    const nextDashboard = await refreshDashboard({ force: true });
    return routeForAccount(sessionRef.current, nextDashboard);
  }, [persistSession, refreshDashboard, setSessionState]);

  const getPostAuthRoute = useCallback(
    () => routeForAccount(sessionRef.current, dashboardRef.current),
    [],
  );

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      status,
      isLoaded: status !== "initializing",
      isSignedIn:
        (status === "authenticated" || status === "authenticated_degraded") &&
        Boolean(session?.token),
      isDegraded: status === "authenticated_degraded",
      token: session?.token ?? null,
      user: session?.user ?? null,
      dashboard,
      restoredDashboard: dashboard,
      dashboardLastUpdatedAt,
      dashboardError,
      pendingVerification,
      saveLoginSession,
      savePendingVerification,
      clearPendingVerification,
      confirmPhoneNumber,
      refreshDashboard,
      applyDashboardSnapshot,
      clearAuthSession,
      getPostAuthRoute,
    }),
    [
      applyDashboardSnapshot,
      clearAuthSession,
      clearPendingVerification,
      confirmPhoneNumber,
      dashboard,
      dashboardError,
      dashboardLastUpdatedAt,
      getPostAuthRoute,
      pendingVerification,
      refreshDashboard,
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
