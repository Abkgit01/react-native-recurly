import {
  AppHeader,
  Card,
  MetricCard,
  ScreenContainer,
  SubmissionCard,
} from "@/components/ElectionUI";
import { retrySubmission, useElectionSubmissions } from "@/lib/electionStore";
import { styled } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Sync() {
  const submissions = useElectionSubmissions();
  const pending = submissions.filter((submission) => submission.syncStatus === "pending-upload").length;
  const synced = submissions.filter((submission) => submission.syncStatus === "synced").length;
  const failed = submissions.filter((submission) => submission.syncStatus === "failed" || submission.syncStatus === "server-rejected").length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-30 pt-5">
          <AppHeader title="Sync Queue" subtitle="Local submissions are distinct from server-confirmed uploads." />
          <View className="flex-row gap-3">
            <MetricCard label="Pending" value={pending} />
            <MetricCard label="Synced" value={synced} />
            <MetricCard label="Failed" value={failed} />
          </View>

          <Card className="gap-2 border-syncing/20 bg-syncing/5">
            <Text className="text-base font-sans-bold text-primary">Global Sync Status</Text>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              Online. Pending uploads will sync only after server confirmation is received.
            </Text>
          </Card>

          <View className="gap-3">
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onRetry={() => retrySubmission(submission.id)}
              />
            ))}
          </View>

          <Card className="gap-3">
            <Text className="text-lg font-sans-bold text-primary">Submission History</Text>
            {submissions.map((submission) => (
              <View key={`${submission.id}-history`} className="rounded-xl bg-background p-3">
                <Text className="font-sans-bold text-primary">{submission.election.name}</Text>
                <Text className="text-xs font-sans-medium text-muted-foreground">
                  {submission.pollingUnit.name} • {submission.localReference}
                </Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
