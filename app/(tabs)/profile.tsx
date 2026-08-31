import {
  AppHeader,
  Card,
  InfoRow,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  StatusBadge,
} from "@/components/ElectionUI";
import {
  type AgentDashboardResponse,
} from "@/lib/authApi";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuthSession } from "@/lib/authSession";
import { styled } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const initialsFromName = (value?: string | null) => {
  if (!value) return "EW";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
    : "EW";
};

const kycStatusVariant = (dashboard?: AgentDashboardResponse | null) => {
  if (dashboard?.kycApproved) return "approved";
  if (dashboard?.kycStatusCode === "Rejected") return "rejected";
  if (dashboard?.kycStatusCode === "Submitted") return "under-review";
  return "pending";
};

export default function Profile() {
  const router = useRouter();
  const {
    clearAuthSession,
    dashboard,
    dashboardError,
    refreshDashboard,
    token,
    user,
  } = useAuthSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const displayName = dashboard?.fullName || user?.fullName || user?.email || "Agent";

  const loadProfile = useCallback(async () => {
    if (!token) return;
    await refreshDashboard({ force: true });
  }, [refreshDashboard, token]);

  useEffect(() => {
    loadProfile().catch((error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Profile could not be loaded.",
      );
    });
  }, [loadProfile]);

  const refresh = async () => {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      await loadProfile();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Profile could not be loaded.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await clearAuthSession();
      router.replace("/(auth)/sign-in");
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-30 pt-5"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          <AppHeader title="Profile" subtitle="Account, role, device, and reviewer tools." />

          {dashboardError || errorMessage ? (
            <Card className="gap-2 border-destructive/30 bg-destructive/5">
              <Text className="text-sm font-sans-bold text-destructive">
                {dashboardError || errorMessage}
              </Text>
            </Card>
          ) : null}

          <Card className="gap-4">
            <View className="flex-row items-center gap-4">
              <View className="size-16 items-center justify-center rounded-full bg-primary">
                <Text className="text-xl font-sans-extrabold text-white">
                  {initialsFromName(displayName)}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-sans-bold text-primary" numberOfLines={1}>{displayName}</Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">Field Agent</Text>
              </View>
              <StatusBadge status={kycStatusVariant(dashboard)} label={dashboard?.kycStatus || "Not Submitted"} />
            </View>
            <InfoRow label="Phone" value={dashboard?.phoneNumber || user?.phoneNumber || "Not available"} />
            <InfoRow label="Email" value={dashboard?.email || user?.email || "Not available"} />
            <InfoRow label="Assignment" value={dashboard?.registeredPollingUnitName || "No approved assignment"} />
            <InfoRow label="Device" value="Registered" />
            <InfoRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
          </Card>

          <Card className="gap-4">
            <Text className="text-lg font-sans-bold text-primary">Settings</Text>
            <InfoRow label="Biometric Lock" value="On" />
            <InfoRow label="Auto Upload" value="On" />
            <InfoRow label="Sync on Wi-Fi only" value="Off" />
            <InfoRow label="Device registration" value="Registered" />
            <SecondaryButton
              danger
              label="Clear Local Drafts"
              onPress={() => Alert.alert("Clear local drafts?", "This requires confirmation before removing locally saved drafts.")}
            />
          </Card>

          <Card className="gap-4">
            <Text className="text-lg font-sans-bold text-primary">Agent Actions</Text>
            <SecondaryButton
              label="Submit KYC"
              onPress={() => router.push("/kyc-submission")}
            />
            <SecondaryButton
              label="Report Incident"
              onPress={() => router.push("/incident-report")}
            />
          </Card>

          <PrimaryButton label={isSigningOut ? "Logging out..." : "Logout"} disabled={isSigningOut} onPress={handleSignOut} />
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
