import {
  AppHeader,
  Card,
  InfoRow,
  MetricCard,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from "@/components/ElectionUI";
import {
  getOpenResultCaptureOptions,
  type AgentDashboardResponse,
  type OpenResultCaptureOptionsResponse,
} from "@/lib/authApi";
import {
  getLastSuccessfulSyncAt,
  useElectionSubmissions,
} from "@/lib/electionStore";
import { useAuthSession } from "@/lib/authSession";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const initialsFromName = (value?: string | null) => {
  if (!value) return "EW";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EW";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
};

const kycStatusVariant = (dashboard?: AgentDashboardResponse | null) => {
  if (dashboard?.kycApproved) return "approved";
  if (dashboard?.kycStatusCode === "Rejected") return "rejected";
  if (dashboard?.kycStatusCode === "Submitted") return "under-review";
  return "pending";
};

export default function Home() {
  const router = useRouter();
  const {
    dashboard,
    dashboardError,
    isDegraded,
    refreshDashboard: refreshSharedDashboard,
    token,
    user,
  } = useAuthSession();
  const submissions = useElectionSubmissions();
  const [captureOptions, setCaptureOptions] =
    useState<OpenResultCaptureOptionsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pendingUploads = submissions.filter(
    (submission) => submission.syncStatus === "pending-upload",
  ).length;
  const lastSync = getLastSuccessfulSyncAt();
  const selectedElection = useMemo(
    () =>
      captureOptions?.openElections?.find(
        (election) => election.electionId === captureOptions.selectedElectionId,
      ) ?? captureOptions?.openElections?.[0],
    [captureOptions],
  );
  const displayName = dashboard?.fullName || user?.fullName || user?.email || "Agent";
  const syncError = dashboardError || errorMessage;

  const loadDashboard = useCallback(async (force = false) => {
    if (!token) return;
    setErrorMessage("");
    const nextDashboard = await refreshSharedDashboard({ force });

    if (nextDashboard?.startCaptureEnabled || nextDashboard?.kycApproved) {
      const options = await getOpenResultCaptureOptions(token).catch(() => null);
      setCaptureOptions(options);
    } else {
      setCaptureOptions(null);
    }
  }, [refreshSharedDashboard, token]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    setIsLoading(true);
    loadDashboard()
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Dashboard could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadDashboard, token]);

  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
          await loadDashboard(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Dashboard could not be loaded.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartCapture = () => {
    if (!dashboard?.startCaptureEnabled) {
      Alert.alert(
        dashboard?.onboardingStatus || "Capture unavailable",
        dashboard?.startCaptureDisabledReason ||
          dashboard?.onboardingMessage ||
          "You will be able to capture results once your account is approved and assigned to an open election.",
      );
      return;
    }

    router.push("/capture");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-30 pt-5"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refreshDashboard} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-b-3xl bg-primary p-5">
            <View className="flex-row items-center gap-4">
              <View className="size-14 items-center justify-center rounded-full bg-card">
                <Text className="text-lg font-sans-extrabold text-primary">
                  {initialsFromName(displayName)}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-sans-semibold text-white/70">
                  Welcome,
                </Text>
                <Text className="text-xl font-sans-bold text-white" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text className="text-xs font-sans-medium text-white/70">
                  Field Agent
                </Text>
              </View>
              <StatusBadge
                status={kycStatusVariant(dashboard)}
                label={dashboard?.kycStatus || "Not Submitted"}
              />
            </View>
          </View>

          <AppHeader title="Agent Home" subtitle="Real assignment and capture status." />

          {isLoading ? (
            <Card>
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                Loading dashboard...
              </Text>
            </Card>
          ) : null}

          {syncError ? (
            <Card className="gap-3 border-destructive/30 bg-destructive/5">
              <Text className="text-base font-sans-bold text-destructive">
                {isDegraded ? "Dashboard offline" : "Dashboard unavailable"}
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {syncError}
              </Text>
              <PrimaryButton label="Retry" onPress={refreshDashboard} />
            </Card>
          ) : null}

          <Card className="gap-2">
            <InfoRow
              label="Assigned PU"
              value={dashboard?.registeredPollingUnitName || "No approved assignment"}
            />
            <InfoRow
              label="Location"
              value={
                dashboard?.registeredLocalGovernmentAreaName && dashboard?.registeredStateName
                  ? `${dashboard.registeredLocalGovernmentAreaName}, ${dashboard.registeredStateName}`
                  : "Not available"
              }
            />
            <InfoRow
              label="Election"
              value={selectedElection?.electionName || "No open election"}
            />
            <InfoRow
              label="Date"
              value={selectedElection ? formatDate(selectedElection.electionDate) : "Not available"}
            />
          </Card>

          <View className="flex-row gap-3">
            <MetricCard label="Open Captures" value={dashboard?.openElectionCount ?? 0} />
            <MetricCard label="Pending Uploads" value={pendingUploads} />
            <MetricCard label="Last Sync" value={lastSync ? formatDateTime(lastSync) : "Never"} />
          </View>

          <Card className="gap-4">
            <View className="flex-row items-center justify-between gap-4">
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-sans-bold text-primary">
                  Election Package
                </Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">
                  {selectedElection?.electionCode || "No package available"}
                </Text>
              </View>
              <StatusBadge
                status={dashboard?.startCaptureEnabled ? "saved-locally" : "offline"}
                label={dashboard?.startCaptureEnabled ? "Ready" : "Unavailable"}
              />
            </View>
            <InfoRow
              label="Capture window"
              value={
                selectedElection?.uploadWindowText ||
                dashboard?.nextUploadWindowText ||
                "Not available"
              }
            />
            <PrimaryButton
              label={dashboard?.startCaptureEnabled ? "Start Capture" : "Capture Locked"}
              onPress={handleStartCapture}
            />
          </Card>

          <Card className="gap-3 border-warning/30 bg-warning/10">
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-base font-sans-bold text-primary">
                {dashboard?.onboardingStatus || "Account status"}
              </Text>
              <StatusBadge status={kycStatusVariant(dashboard)} />
            </View>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              {dashboard?.onboardingMessage ||
                "Complete verification before capturing polling-unit results."}
            </Text>
          </Card>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
