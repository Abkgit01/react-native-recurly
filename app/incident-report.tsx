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
import {
  getIncidentStart,
  submitIncidentReport,
  type IncidentStartResponse,
  type KycImageAsset,
} from "@/lib/authApi";
import { Redirect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useAuthSession } from "@/lib/authSession";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const incidentTypes = [
  { value: 1, label: "Violence" },
  { value: 2, label: "Vote buying" },
  { value: 3, label: "Intimidation" },
  { value: 4, label: "Ballot snatching" },
  { value: 5, label: "Missing materials" },
  { value: 6, label: "Equipment failure" },
  { value: 7, label: "Other misconduct" },
];

const severityOptions = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Critical" },
];

const getImageName = (uri: string, fallback: string) => {
  const name = uri.split("/").pop()?.split("?")[0];
  return name || fallback;
};

type LocationEvidence = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAtUtc: string;
};

const getCurrentLocationEvidence = async (): Promise<LocationEvidence> => {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("Location services are disabled. Enable location before reporting an incident.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Location permission is required for incident evidence.");
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyMeters: location.coords.accuracy,
    capturedAtUtc: new Date(location.timestamp).toISOString(),
  };
};

export default function IncidentReportScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, token } = useAuthSession();
  const [start, setStart] = useState<IncidentStartResponse | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [incidentType, setIncidentType] = useState(1);
  const [severity, setSeverity] = useState(2);
  const [description, setDescription] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [evidence, setEvidence] = useState<KycImageAsset[]>([]);
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [incidentNumber, setIncidentNumber] = useState("");
  const [locationEvidence, setLocationEvidence] = useState<LocationEvidence | null>(null);

  const selectedElection = useMemo(
    () =>
      (start?.eligibleElections ?? []).find(
        (election) => election.electionId === selectedElectionId,
      ) ?? null,
    [selectedElectionId, start?.eligibleElections],
  );

  const loadStart = useCallback(
    async (electionId?: number) => {
      if (!token) return;
      setIsLoading(true);
      setErrorMessage("");
      try {
        const result = await getIncidentStart(token, electionId);
        setStart(result);
        setSelectedElectionId(
          result.selectedElectionId ??
            result.eligibleElections?.[0]?.electionId ??
            null,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Incident reporting could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadStart();
  }, [loadStart]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const goToProfile = () => {
    router.replace("/(tabs)/profile");
  };

  const chooseEvidence = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        source === "camera"
          ? "Camera access is needed to attach incident evidence."
          : "Photo library access is needed to attach incident evidence.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            base64: false,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            base64: false,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setEvidence((items) =>
      [
        ...items,
        {
          uri: asset.uri,
          fileName: asset.fileName ?? getImageName(asset.uri, "incident.jpg"),
          mimeType: asset.mimeType ?? "image/jpeg",
        },
      ].slice(0, 5),
    );
  };

  const canSubmit =
    Boolean(start?.isEligible) &&
    Boolean(selectedElectionId) &&
    Boolean(description.trim()) &&
    confirmationAccepted &&
    !isSubmitting;

  const submitIncident = async () => {
    if (!token || !selectedElectionId) return;
    if (!start?.isEligible) {
      Alert.alert(
        "Not eligible",
        start?.ineligibilityReason ??
          "No open election is configured for your verified polling unit.",
      );
      return;
    }
    if (!description.trim()) {
      Alert.alert("Incident incomplete", "Describe what happened before submitting.");
      return;
    }
    if (!confirmationAccepted) {
      Alert.alert("Confirmation required", "Confirm that this incident report is accurate.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const location = locationEvidence ?? (await getCurrentLocationEvidence());
      setLocationEvidence(location);
      const result = await submitIncidentReport({
        token,
        electionId: selectedElectionId,
        type: incidentType,
        severity,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationAccuracyMeters: location.accuracyMeters,
        locationDescription: locationDescription.trim() || null,
        incidentHappenedAtUtc: location.capturedAtUtc,
        confirmationAccepted,
        attachments: evidence,
      });
      setIncidentNumber(result.incidentNumber);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Incident report could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            subtitle="Submit incidents tied to your verified polling unit."
          />

          {isLoading ? (
            <Card className="gap-3">
              <Text className="text-lg font-sans-bold text-primary">
                Loading incident context
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                Checking your verification, assignment, and open elections.
              </Text>
            </Card>
          ) : null}

          {errorMessage ? (
            <Card className="gap-3 border-destructive/30 bg-destructive/5">
              <Text className="text-sm font-sans-bold text-destructive">
                {errorMessage}
              </Text>
              <SecondaryButton label="Retry" onPress={() => loadStart()} />
            </Card>
          ) : null}

          {!isLoading && start && !start.isEligible ? (
            <Card className="gap-3 border-warning/30 bg-warning/10">
              <Text className="text-xl font-sans-bold text-warning">
                Incident reporting locked
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {start.ineligibilityReason ??
                  "You will be able to report incidents once your verification and assignment are active."}
              </Text>
              <SecondaryButton label="Back to Profile" onPress={goToProfile} />
            </Card>
          ) : null}

          {incidentNumber ? (
            <Card className="gap-4 border-success/30 bg-success/10">
              <StatusBadge status="synced" label="Submitted" />
              <Text className="text-xl font-sans-bold text-primary">
                Incident submitted
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                The backend has received this incident report for review.
              </Text>
              <InfoRow label="Reference" value={incidentNumber} />
              <PrimaryButton label="Back to Profile" onPress={goToProfile} />
            </Card>
          ) : null}

          {!isLoading && start?.isEligible && !incidentNumber ? (
            <>
              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Polling unit
                </Text>
                <InfoRow
                  label="Election"
                  value={selectedElection?.electionName ?? "Open election"}
                />
                <InfoRow
                  label="Polling Unit"
                  value={start.pollingUnitName ?? "Assigned polling unit"}
                />
                <InfoRow label="State" value={start.stateName ?? "Not available"} />
                <InfoRow
                  label="LGA"
                  value={start.localGovernmentAreaName ?? "Not available"}
                />
                <InfoRow label="Ward" value={start.wardName ?? "Not available"} />
                <InfoRow
                  label="Location"
                  value={
                    locationEvidence
                      ? `Captured (${locationEvidence.accuracyMeters ?? "unknown"}m accuracy)`
                      : "Captured on submit"
                  }
                />
                <StatusBadge status="verified" label="Verified Polling Unit" />
              </Card>

              {start.eligibleElections && start.eligibleElections.length > 1 ? (
                <Card className="gap-3">
                  <Text className="text-lg font-sans-bold text-primary">
                    Election
                  </Text>
                  {start.eligibleElections.map((election) => (
                    <Pressable
                      key={election.electionId}
                      className={`rounded-xl border p-3 ${
                        election.electionId === selectedElectionId
                          ? "border-accent bg-accent/10"
                          : "border-border bg-background"
                      }`}
                      onPress={() => {
                        setSelectedElectionId(election.electionId);
                        loadStart(election.electionId);
                      }}
                    >
                      <Text className="font-sans-bold text-primary">
                        {election.electionName ?? "Election"}
                      </Text>
                      <Text className="mt-1 text-xs font-sans-medium text-muted-foreground">
                        {election.uploadWindowText ?? election.electionCode ?? "Open"}
                      </Text>
                    </Pressable>
                  ))}
                </Card>
              ) : null}

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Incident details
                </Text>
                <View className="gap-2">
                  <Text className="text-sm font-sans-semibold text-primary">
                    Incident type
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {incidentTypes.map((item) => (
                      <Pressable
                        key={item.value}
                        className={`rounded-full px-3 py-2 ${
                          incidentType === item.value
                            ? "bg-accent"
                            : "bg-accent/10"
                        }`}
                        onPress={() => setIncidentType(item.value)}
                      >
                        <Text
                          className={`text-xs font-sans-bold ${
                            incidentType === item.value
                              ? "text-white"
                              : "text-accent"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-sans-semibold text-primary">
                    Severity
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {severityOptions.map((item) => (
                      <Pressable
                        key={item.value}
                        className={`rounded-full px-3 py-2 ${
                          severity === item.value ? "bg-warning" : "bg-warning/10"
                        }`}
                        onPress={() => setSeverity(item.value)}
                      >
                        <Text
                          className={`text-xs font-sans-bold ${
                            severity === item.value
                              ? "text-white"
                              : "text-warning"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <FormField
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Describe what happened..."
                />
                <FormField
                  label="Location note"
                  value={locationDescription}
                  onChangeText={setLocationDescription}
                  placeholder="Optional location detail"
                />
              </Card>

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Evidence
                </Text>
                {evidence.length ? (
                  <View className="flex-row flex-wrap gap-3">
                    {evidence.map((item) => (
                      <Image
                        key={item.uri}
                        className="h-20 w-20 rounded-xl border border-border"
                        source={{ uri: item.uri }}
                      />
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm font-sans-medium text-muted-foreground">
                    Add photo evidence if available.
                  </Text>
                )}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <SecondaryButton
                      label="Attach file"
                      onPress={() => chooseEvidence("library")}
                    />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton
                      label="Use camera"
                      onPress={() => chooseEvidence("camera")}
                    />
                  </View>
                </View>
              </Card>

              <Pressable
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
                onPress={() => setConfirmationAccepted((value) => !value)}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-md border ${
                    confirmationAccepted
                      ? "border-accent bg-accent"
                      : "border-border bg-background"
                  }`}
                >
                  <Text className="text-xs font-sans-bold text-white">
                    {confirmationAccepted ? "✓" : ""}
                  </Text>
                </View>
                <Text className="flex-1 text-sm font-sans-medium text-primary">
                  I confirm this incident report is accurate to the best of my knowledge.
                </Text>
              </Pressable>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton
                    label="Back"
                    disabled={isSubmitting}
                    onPress={goToProfile}
                  />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Submit Incident"}
                    disabled={!canSubmit}
                    onPress={submitIncident}
                  />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
