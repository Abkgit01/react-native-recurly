import {
  AppHeader,
  Card,
  FormField,
  InfoRow,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  StatusBadge,
} from "@/components/ElectionUI";
import { assignedPollingUnit, currentElection } from "@/assets/constants/data";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { styled } from "nativewind";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function IncidentReportScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [incidentType, setIncidentType] = useState("Network outage");
  const [description, setDescription] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [localReference] = useState(() => `EW-INC-${String(Date.now()).slice(-6)}`);

  const isEligible = currentElection.status === "active";
  const canSubmit = isEligible && incidentType.trim() && description.trim();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const submitIncident = () => {
    if (!isEligible) {
      Alert.alert("Not eligible", "No open election is configured for your verified polling unit.");
      return;
    }

    if (!canSubmit) {
      Alert.alert("Incident incomplete", "Select an incident type and describe what happened.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenContainer padded={false}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-10 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Report Incident"
            subtitle="Submit operational or security incidents tied to your verified polling unit."
          />

          {!isEligible ? (
            <Card className="gap-3 border-warning/30 bg-warning/10">
              <Text className="text-xl font-sans-bold text-warning">
                You are not eligible to report an incident
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                No open election is configured for your verified polling unit.
              </Text>
              <SecondaryButton label="Back to Profile" onPress={() => router.back()} />
            </Card>
          ) : null}

          {submitted ? (
            <Card className="gap-4 border-warning/30 bg-warning/10">
              <StatusBadge status="pending-upload" label="Saved Offline" />
              <Text className="text-xl font-sans-bold text-primary">
                Incident queued
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                The incident is saved locally and will sync when connectivity is available.
              </Text>
              <InfoRow label="Local reference" value={localReference} />
              <PrimaryButton label="Back to Profile" onPress={() => router.back()} />
            </Card>
          ) : null}

          {isEligible && !submitted ? (
            <>
              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Polling unit
                </Text>
                <InfoRow label="Election" value={currentElection.name} />
                <InfoRow label="Polling Unit" value={assignedPollingUnit.name} />
                <InfoRow label="State" value={assignedPollingUnit.state} />
                <InfoRow label="LGA" value={assignedPollingUnit.lga} />
                <InfoRow label="Ward" value={assignedPollingUnit.ward} />
                <StatusBadge status="verified" label="Verified Polling Unit" />
              </Card>

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Incident details
                </Text>
                <FormField
                  label="Incident type"
                  value={incidentType}
                  onChangeText={setIncidentType}
                  placeholder="Network outage, late opening, disruption..."
                />
                <FormField
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Describe what happened..."
                />
                <FormField
                  label="Evidence"
                  value={evidenceRef}
                  onChangeText={setEvidenceRef}
                  placeholder="Optional image/video local reference"
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <SecondaryButton label="Attach file" onPress={() => setEvidenceRef("incident-evidence-local.jpg")} />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton label="Use camera" onPress={() => setEvidenceRef("incident-camera-capture.jpg")} />
                  </View>
                </View>
              </Card>

              <Card className="gap-3 border-warning/30 bg-warning/10">
                <Text className="text-base font-sans-bold text-primary">
                  Offline-ready
                </Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">
                  If there is no internet connection, this report remains saved locally until sync completes.
                </Text>
              </Card>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton label="Back" onPress={() => router.back()} />
                </View>
                <View className="flex-1">
                  <PrimaryButton label="Submit Incident" disabled={!canSubmit} onPress={submitIncident} />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
