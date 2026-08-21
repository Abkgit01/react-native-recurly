import { useUser } from "@clerk/expo";
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
  assignedPollingUnit,
  currentAgent,
  currentElection,
  electionPackage,
} from "@/assets/constants/data";
import { useElectionSubmissions } from "@/lib/electionStore";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const submissions = useElectionSubmissions();
  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    currentAgent.name;
  const pendingUploads = submissions.filter(
    (submission) => submission.syncStatus === "pending-upload",
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-30 pt-5"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-b-3xl bg-primary p-5">
            <View className="flex-row items-center gap-4">
              <View className="size-14 items-center justify-center rounded-full bg-card">
                <Text className="text-lg font-sans-extrabold text-primary">
                  {currentAgent.initials}
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
              <StatusBadge status={currentAgent.kycStatus} label="KYC Verified" />
            </View>
          </View>

          <AppHeader
            title="Agent Home"
            subtitle="Your assigned polling unit and offline capture status."
          />

          <Card className="gap-2">
            <InfoRow label="Assigned PU" value={assignedPollingUnit.name} />
            <InfoRow label="Location" value={`${assignedPollingUnit.lga}, ${assignedPollingUnit.state}`} />
            <InfoRow label="Election" value={currentElection.name} />
            <InfoRow label="Date" value={formatDate(currentElection.date)} />
          </Card>

          <View className="flex-row gap-3">
            <MetricCard label="Open Captures" value="1" />
            <MetricCard label="Pending Uploads" value={pendingUploads} />
            <MetricCard label="Last Sync" value="10m" />
          </View>

          <Card className="gap-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-sans-bold text-primary">
                  Election Package
                </Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">
                  {electionPackage.version} • downloaded
                </Text>
              </View>
              <StatusBadge status="saved-locally" label="Offline Ready" />
            </View>
            <InfoRow
              label="Last downloaded"
              value={formatDateTime(electionPackage.lastDownloadedAt)}
            />
            <PrimaryButton
              label="Start Capture"
              onPress={() => router.push("./capture")}
            />
          </Card>

          <Card className="gap-3 border-warning/30 bg-warning/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-sans-bold text-primary">
                Offline Mode
              </Text>
              <StatusBadge status="offline" />
            </View>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              You can capture results offline. Submissions remain queued locally until connectivity is available.
            </Text>
          </Card>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
