import {
  AppHeader,
  Card,
  MetricCard,
  ScreenContainer,
  SubmissionCard,
} from "@/components/ElectionUI";
import { getMyResultSubmissions, type ResultSubmissionListItem } from "@/lib/authApi";
import { useAuthSession } from "@/lib/authSession";
import {
  syncQueuedSubmission,
  useElectionSubmissions,
} from "@/lib/electionStore";
import { formatDateTime } from "@/lib/utils";
import { styled } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Sync() {
  const { token } = useAuthSession();
  const submissions = useElectionSubmissions();
  const [serverSubmissions, setServerSubmissions] = useState<ResultSubmissionListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pending = submissions.filter((submission) => submission.syncStatus === "pending-upload").length;
  const syncedLocal = submissions.filter((submission) => submission.syncStatus === "synced").length;
  const failed = submissions.filter((submission) => submission.syncStatus === "failed" || submission.syncStatus === "server-rejected").length;

  const loadServerHistory = useCallback(async () => {
    if (!token) return;
    const result = await getMyResultSubmissions(token);
    setServerSubmissions(result);
  }, [token]);

  useEffect(() => {
    loadServerHistory().catch((error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Submission history could not be loaded.",
      );
    });
  }, [loadServerHistory]);

  const refresh = async () => {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      await loadServerHistory();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Submission history could not be loaded.",
      );
    } finally {
      setIsRefreshing(false);
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
          <AppHeader title="Sync Queue" subtitle="Local submissions are distinct from server-confirmed uploads." />
          <View className="flex-row gap-3">
            <MetricCard label="Pending" value={pending} />
            <MetricCard label="Synced" value={syncedLocal + serverSubmissions.length} />
            <MetricCard label="Failed" value={failed} />
          </View>

          <Card className="gap-2 border-syncing/20 bg-syncing/5">
            <Text className="text-base font-sans-bold text-primary">Global Sync Status</Text>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              Pending uploads sync only after the server confirms receipt.
            </Text>
            {errorMessage ? (
              <Text className="text-sm font-sans-semibold text-destructive">
                {errorMessage}
              </Text>
            ) : null}
          </Card>

          <View className="gap-3">
            {submissions.length ? (
              submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onRetry={() => {
                    if (token) syncQueuedSubmission(token, submission.id);
                  }}
                />
              ))
            ) : (
              <Card>
                <Text className="text-sm font-sans-semibold text-muted-foreground">
                  No local submissions are waiting to sync.
                </Text>
              </Card>
            )}
          </View>

          <Card className="gap-3">
            <Text className="text-lg font-sans-bold text-primary">Submission History</Text>
            {serverSubmissions.length ? (
              serverSubmissions.map((submission) => (
                <View key={submission.resultSubmissionId} className="rounded-xl bg-background p-3">
                  <Text className="font-sans-bold text-primary">{submission.electionName}</Text>
                  <Text className="text-xs font-sans-medium text-muted-foreground">
                    {submission.pollingUnitName} - {submission.status} - {formatDateTime(submission.submittedAtUtc)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm font-sans-medium text-muted-foreground">
                No server-confirmed submissions yet.
              </Text>
            )}
          </Card>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
