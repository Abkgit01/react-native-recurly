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
  adminMetrics,
  assignedPollingUnit,
  currentAgent,
  incidents,
  kycQueue,
  resultReviewQueue,
} from "@/assets/constants/data";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuthSession } from "@/lib/authSession";
import { styled } from "nativewind";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Profile() {
  const router = useRouter();
  const { clearAuthSession, user } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName =
    user?.fullName ||
    user?.email ||
    currentAgent.name;

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
        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-30 pt-5">
          <AppHeader title="Profile" subtitle="Account, role, device, and reviewer tools." />

          <Card className="gap-4">
            <View className="flex-row items-center gap-4">
              <View className="size-16 items-center justify-center rounded-full bg-primary">
                <Text className="text-xl font-sans-extrabold text-white">{currentAgent.initials}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-sans-bold text-primary" numberOfLines={1}>{displayName}</Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">{currentAgent.role}</Text>
              </View>
              <StatusBadge status={currentAgent.kycStatus} />
            </View>
            <InfoRow label="Phone" value={user?.phoneNumber ?? currentAgent.phone} />
            <InfoRow label="Email" value={user?.email ?? currentAgent.email} />
            <InfoRow label="Assignment" value={assignedPollingUnit.name} />
            <InfoRow label="Device" value={currentAgent.deviceStatus} />
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

          <Card className="gap-4">
            <Text className="text-lg font-sans-bold text-primary">Admin / Reviewer</Text>
            <View className="flex-row flex-wrap gap-3">
              {adminMetrics.map((metric) => (
                <View key={metric.label} className="w-[47%] rounded-xl bg-background p-3">
                  <Text className="text-2xl font-sans-extrabold text-primary">{metric.value}</Text>
                  <Text className="text-xs font-sans-semibold text-muted-foreground">{metric.label}</Text>
                </View>
              ))}
            </View>
            <Text className="text-base font-sans-bold text-primary">KYC Queue</Text>
            {kycQueue.map((item) => (
              <View key={item.id} className="rounded-xl bg-background p-3">
                <View className="flex-row justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans-bold text-primary">{item.agentName}</Text>
                    <Text className="text-xs font-sans-medium text-muted-foreground">{item.pollingUnit}</Text>
                  </View>
                  <StatusBadge status={item.status} label={`${item.confidence}%`} />
                </View>
              </View>
            ))}
            <Text className="text-base font-sans-bold text-primary">Result Reviews</Text>
            {resultReviewQueue.map((item) => (
              <View key={item.id} className="rounded-xl bg-background p-3">
                <Text className="font-sans-bold text-primary">{item.pollingUnit}</Text>
                <Text className="text-xs font-sans-medium text-muted-foreground">{item.reason} • {item.agentName}</Text>
              </View>
            ))}
            <Text className="text-base font-sans-bold text-primary">Incidents</Text>
            {incidents.map((incident) => (
              <InfoRow key={incident.id} label={incident.type} value={`${incident.location}, ${incident.time}`} />
            ))}
          </Card>

          <PrimaryButton label={isSigningOut ? "Logging out..." : "Logout"} disabled={isSigningOut} onPress={handleSignOut} />
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
