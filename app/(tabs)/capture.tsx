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
  analyzeEc8aImage,
  getIncidentStart,
  getOpenResultCaptureOptions,
  startResultCaptureSession,
  submitIncidentReport,
  type AnalyzeEc8aResult,
  type IncidentStartResponse,
  submitResultCapture,
  type KycImageAsset,
  type OpenResultCaptureOptionsResponse,
  type ResultCaptureElectionOption,
  type ResultCapturePartyScore,
  type ResultCaptureSessionStart,
} from "@/lib/authApi";
import { queueSubmission } from "@/lib/electionStore";
import { useAuthSession } from "@/lib/authSession";
import { formatDate, formatDateTime } from "@/lib/utils";
import * as Application from "expo-application";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
type CaptureStep = "package" | "start" | "camera" | "entry" | "review" | "queued" | "incident";

type LocationEvidence = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAtUtc: string;
};

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

const isNetworkError = (error: unknown) =>
  error instanceof Error && error.message.startsWith("Unable to reach ElectionApp API");

const numberOnly = (value: string) => value.replace(/\D/g, "");
const toNullableNumber = (value: string) =>
  value.trim() === "" ? null : Number(value);

const createIdempotencyKey = () =>
  `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getAssetName = (asset: ImagePicker.ImagePickerAsset, fallback: string) =>
  asset.fileName ?? asset.uri.split("/").pop() ?? fallback;

const toCaptureAsset = (
  asset: ImagePicker.ImagePickerAsset,
  fallback: string,
): KycImageAsset => ({
  uri: asset.uri,
  fileName: getAssetName(asset, fallback),
  mimeType: asset.mimeType ?? "image/jpeg",
});

const getCurrentLocationEvidence = async (): Promise<LocationEvidence> => {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("Location services are disabled. Enable location before capture.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Location permission is required for capture and incident evidence.");
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

const extractedValue = <T,>(field?: { value?: T | null; status?: string } | null) => {
  if (!field || field.value === null || field.value === undefined) return null;
  if (field.status && ["Unreadable", "ScoreUnreadable"].includes(field.status)) return null;
  return field.value;
};

export default function Capture() {
  const { token } = useAuthSession();
  const [step, setStep] = useState<CaptureStep>("package");
  const [options, setOptions] = useState<OpenResultCaptureOptionsResponse | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [session, setSession] = useState<ResultCaptureSessionStart | null>(null);
  const [ec8aImage, setEc8aImage] = useState<KycImageAsset | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [registeredVoters, setRegisteredVoters] = useState("");
  const [accreditedVoters, setAccreditedVoters] = useState("");
  const [ballotPapersIssued, setBallotPapersIssued] = useState("");
  const [unusedBallotPapers, setUnusedBallotPapers] = useState("");
  const [spoiledBallotPapers, setSpoiledBallotPapers] = useState("");
  const [validVotes, setValidVotes] = useState("");
  const [rejectedVotes, setRejectedVotes] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [queuedRef, setQueuedRef] = useState("");
  const [serverReceipt, setServerReceipt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ec8aOcrResult, setEc8aOcrResult] = useState<AnalyzeEc8aResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAnalyzingEc8a, setIsAnalyzingEc8a] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [returnStep, setReturnStep] = useState<CaptureStep>("start");
  const [incidentStart, setIncidentStart] = useState<IncidentStartResponse | null>(null);
  const [incidentType, setIncidentType] = useState(1);
  const [incidentSeverity, setIncidentSeverity] = useState(2);
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentLocationDescription, setIncidentLocationDescription] = useState("");
  const [incidentEvidence, setIncidentEvidence] = useState<KycImageAsset[]>([]);
  const [incidentConfirmationAccepted, setIncidentConfirmationAccepted] = useState(false);
  const [incidentNumber, setIncidentNumber] = useState("");
  const [isIncidentLoading, setIsIncidentLoading] = useState(false);
  const [isIncidentSubmitting, setIsIncidentSubmitting] = useState(false);
  const [captureLocation, setCaptureLocation] = useState<LocationEvidence | null>(null);
  const [incidentLocation, setIncidentLocation] = useState<LocationEvidence | null>(null);

  const selectedElection = useMemo(
    () =>
      options?.openElections?.find(
        (election) => election.electionId === selectedElectionId,
      ) ?? options?.openElections?.[0] ?? null,
    [options, selectedElectionId],
  );

  const parties = useMemo(
    () => options?.partyScores ?? [],
    [options?.partyScores],
  );
  const partyScores = useMemo<ResultCapturePartyScore[]>(
    () =>
      parties.map((party) => ({
        ...party,
        score: Number(scores[party.electionPartyId] || 0),
      })),
    [parties, scores],
  );
  const partyTotal = partyScores.reduce((sum, party) => sum + (party.score ?? 0), 0);
  const totalVotesCast =
    (Number(spoiledBallotPapers || 0) || 0) +
    (Number(validVotes || 0) || 0) +
    (Number(rejectedVotes || 0) || 0);
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const registered = toNullableNumber(registeredVoters);
    const accredited = toNullableNumber(accreditedVoters);
    const issued = toNullableNumber(ballotPapersIssued);
    const unused = toNullableNumber(unusedBallotPapers);
    const spoiled = toNullableNumber(spoiledBallotPapers);
    const valid = toNullableNumber(validVotes);
    const rejected = toNullableNumber(rejectedVotes);
    const cast =
      valid !== null || rejected !== null || spoiled !== null
        ? totalVotesCast
        : null;

    if (valid !== null && valid !== partyTotal) {
      issues.push(`Total valid votes must equal party-score total (${partyTotal}).`);
    }
    if (issued !== null && unused !== null && cast !== null && issued !== unused + cast) {
      issues.push("Ballot papers issued must equal unused ballot papers plus total used ballot papers.");
    }
    if (cast !== null && accredited !== null && cast > accredited) {
      issues.push("Total number of used ballot papers cannot exceed accredited voters.");
    }
    if (issued !== null && cast !== null && cast > issued) {
      issues.push("Total number of used ballot papers cannot exceed ballot papers issued.");
    }
    if (registered !== null && accredited !== null && accredited > registered) {
      issues.push("Accredited voters cannot exceed registered voters.");
    }
    return issues;
  }, [
    accreditedVoters,
    ballotPapersIssued,
    partyTotal,
    registeredVoters,
    rejectedVotes,
    spoiledBallotPapers,
    totalVotesCast,
    unusedBallotPapers,
    validVotes,
  ]);

  const canReview =
    Boolean(ec8aImage && parties.length && parties.every((party) => scores[party.electionPartyId] !== undefined)) &&
    validationIssues.length === 0;
  const selectedIncidentElection = useMemo(
    () =>
      (incidentStart?.eligibleElections ?? []).find(
        (election) => election.electionId === selectedElectionId,
      ) ?? selectedElection,
    [incidentStart?.eligibleElections, selectedElection, selectedElectionId],
  );
  const canSubmitIncident =
    Boolean(incidentStart?.isEligible) &&
    Boolean(selectedIncidentElection?.electionId) &&
    Boolean(incidentDescription.trim()) &&
    incidentConfirmationAccepted &&
    !isIncidentSubmitting;

  const loadOptions = useCallback(async () => {
    if (!token) return;
    setErrorMessage("");
    const result = await getOpenResultCaptureOptions(token, selectedElectionId ?? undefined);
    setOptions(result);
    const nextElectionId =
      result.selectedElectionId ?? result.openElections?.[0]?.electionId ?? null;
    setSelectedElectionId(nextElectionId);
    setScores(
      Object.fromEntries(
        (result.partyScores ?? []).map((party) => [party.electionPartyId, ""]),
      ),
    );
  }, [selectedElectionId, token]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    setIsLoading(true);
    loadOptions()
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Capture package could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadOptions, token]);

  const selectElection = async (election: ResultCaptureElectionOption) => {
    if (!token) return;
    setSelectedElectionId(election.electionId);
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await getOpenResultCaptureOptions(token, election.electionId);
      setOptions(result);
      setScores(
        Object.fromEntries(
          (result.partyScores ?? []).map((party) => [party.electionPartyId, ""]),
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Election package could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const beginCapture = async () => {
    if (!token || !selectedElection) return;
    if (!options?.isEligible) {
      Alert.alert(
        "Capture unavailable",
        options?.ineligibilityReason ||
          "You are not eligible to capture results right now.",
      );
      return;
    }

    setIsStarting(true);
    setErrorMessage("");
    try {
      const location = await getCurrentLocationEvidence();
      setCaptureLocation(location);
      const started = await startResultCaptureSession(token, {
        electionId: selectedElection.electionId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        shutterCapturedAtUtc: location.capturedAtUtc,
        deviceId: Application.applicationId ?? undefined,
        idempotencyKey,
      });
      setSession(started);
      setStep("camera");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Capture session could not be started.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const captureEc8a = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        "Allow camera access to capture the EC8A result sheet.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      base64: false,
      cameraType: ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets[0]) {
      setEc8aImage(toCaptureAsset(result.assets[0], "ec8a-result.jpg"));
      setEc8aOcrResult(null);
    }
  };

  const analyzeAndContinue = async () => {
    if (!token || !selectedElection || !ec8aImage) return;

    setIsAnalyzingEc8a(true);
    setErrorMessage("");
    try {
      const result = await analyzeEc8aImage(
        token,
        selectedElection.electionId,
        ec8aImage,
      );
      setEc8aOcrResult(result);
      const accounting = result.accounting;
      const header = result.header;
      const referenceNumber = extractedValue<string>(header?.referenceNumber);
      if (referenceNumber) setSerialNumber(referenceNumber);
      const votersOnRegister = extractedValue<number>(accounting?.numberOfVotersOnRegister);
      if (votersOnRegister !== null) setRegisteredVoters(String(votersOnRegister));
      const accredited = extractedValue<number>(accounting?.numberOfAccreditedVoters);
      if (accredited !== null) setAccreditedVoters(String(accredited));
      const issued = extractedValue<number>(accounting?.numberOfBallotPapersIssued);
      if (issued !== null) setBallotPapersIssued(String(issued));
      const unused = extractedValue<number>(accounting?.numberOfUnusedBallotPapers);
      if (unused !== null) setUnusedBallotPapers(String(unused));
      const spoiled = extractedValue<number>(accounting?.numberOfSpoiledBallotPapers);
      if (spoiled !== null) setSpoiledBallotPapers(String(spoiled));
      const rejected = extractedValue<number>(accounting?.numberOfRejectedBallots);
      if (rejected !== null) setRejectedVotes(String(rejected));
      const totalValid = extractedValue<number>(accounting?.numberOfTotalValidVotes);
      if (totalValid !== null) setValidVotes(String(totalValid));
      setScores((current) => ({
        ...current,
        ...Object.fromEntries(
          (result.candidateScores ?? result.scores)
            .filter(
              (score) =>
                (score.status === "Matched" || score.status === "PartyNotFound") &&
                score.ocrScore !== null &&
                score.ocrScore !== undefined,
            )
            .map((score) => [score.electionPartyId, String(score.ocrScore)]),
        ),
      }));
      setStep("entry");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "EC8A scores could not be read.",
      );
    } finally {
      setIsAnalyzingEc8a(false);
    }
  };

  const chooseIncidentEvidence = async (source: "camera" | "library") => {
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
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            base64: false,
            mediaTypes: ["images"],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) return;

    setIncidentEvidence((items) =>
      [...items, toCaptureAsset(result.assets[0], "incident-evidence.jpg")].slice(0, 5),
    );
  };

  const openIncident = async () => {
    if (!token) return;
    setReturnStep(step === "incident" ? returnStep : step);
    setIncidentNumber("");
    setErrorMessage("");
    setIsIncidentLoading(true);
    setStep("incident");

    try {
      const result = await getIncidentStart(token, selectedElectionId ?? undefined);
      setIncidentStart(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Incident reporting could not be loaded.",
      );
    } finally {
      setIsIncidentLoading(false);
    }
  };

  const submitIncident = async () => {
    if (!token || !selectedIncidentElection?.electionId) return;
    if (!incidentStart?.isEligible) {
      Alert.alert(
        "Incident reporting locked",
        incidentStart?.ineligibilityReason ??
          "You will be able to report incidents once your verification and assignment are active.",
      );
      return;
    }
    if (!incidentDescription.trim()) {
      Alert.alert("Incident incomplete", "Describe what happened before submitting.");
      return;
    }
    if (!incidentConfirmationAccepted) {
      Alert.alert("Confirmation required", "Confirm that this incident report is accurate.");
      return;
    }

    setIsIncidentSubmitting(true);
    setErrorMessage("");
    try {
      const location = incidentLocation ?? (await getCurrentLocationEvidence());
      setIncidentLocation(location);
      const result = await submitIncidentReport({
        token,
        electionId: selectedIncidentElection.electionId,
        type: incidentType,
        severity: incidentSeverity,
        description: incidentDescription.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationAccuracyMeters: location.accuracyMeters,
        locationDescription: incidentLocationDescription.trim() || null,
        incidentHappenedAtUtc: new Date().toISOString(),
        confirmationAccepted: incidentConfirmationAccepted,
        attachments: incidentEvidence,
      });
      setIncidentNumber(result.incidentNumber);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Incident report could not be submitted.",
      );
    } finally {
      setIsIncidentSubmitting(false);
    }
  };

  const submitOrQueue = async () => {
    if (!token || !selectedElection || !session || !ec8aImage) return;

    const payload = {
      captureSessionId: session.captureSessionId,
      electionId: selectedElection.electionId,
      ec8aImage,
      imageSource: "LiveCapture" as const,
      ec8aSerialNumber: serialNumber.trim() || null,
      registeredVoters: toNullableNumber(registeredVoters),
      accreditedVoters: toNullableNumber(accreditedVoters),
      ballotPapersIssued: toNullableNumber(ballotPapersIssued),
      unusedBallotPapers: toNullableNumber(unusedBallotPapers),
      spoiledBallotPapers: toNullableNumber(spoiledBallotPapers),
      totalValidVotes: toNullableNumber(validVotes),
      rejectedVotes: toNullableNumber(rejectedVotes),
      totalVotesCast:
        validVotes.trim() || rejectedVotes.trim() || spoiledBallotPapers.trim()
          ? totalVotesCast
          : null,
      note: notes.trim() || null,
      shutterLatitude: captureLocation?.latitude ?? null,
      shutterLongitude: captureLocation?.longitude ?? null,
      shutterAccuracyMeters: captureLocation?.accuracyMeters ?? null,
      shutterCapturedAtUtc: captureLocation?.capturedAtUtc ?? new Date().toISOString(),
      idempotencyKey,
      partyScores,
    };

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await submitResultCapture({ token, ...payload });
      setServerReceipt(response.receiptCode);
      setStep("queued");
    } catch (error) {
      if (isNetworkError(error)) {
        const queued = queueSubmission({
          election: selectedElection,
          pollingUnit: {
            id: session.pollingUnitId,
            code: session.pollingUnitCode,
            name: session.pollingUnitName,
            state: session.stateName,
            lga: session.localGovernmentAreaName,
            ward: session.wardName,
          },
          partyScores,
          registeredVoters: payload.registeredVoters,
          accreditedVoters: payload.accreditedVoters,
          ballotPapersIssued: payload.ballotPapersIssued,
          unusedBallotPapers: payload.unusedBallotPapers,
          spoiledBallotPapers: payload.spoiledBallotPapers,
          validVotes: payload.totalValidVotes,
          rejectedVotes: payload.rejectedVotes,
          totalVotesCast: payload.totalVotesCast,
          notes,
          image: ec8aImage,
          submitPayload: payload,
        });
        setQueuedRef(queued.localReference);
        setStep("queued");
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Result submission failed.",
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
          contentContainerClassName="gap-5 px-5 pb-30 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Capture"
            subtitle="Prepare, capture EC8A evidence, enter scores, and submit securely."
          />

          <View className="flex-row gap-2">
            {["package", "start", "camera", "entry", "review", "queued"].map((item) => (
              <View
                key={item}
                className={`h-1 flex-1 rounded-full ${item === step ? "bg-accent" : "bg-muted"}`}
              />
            ))}
          </View>

          {errorMessage ? (
            <Card className="gap-2 border-destructive/30 bg-destructive/5">
              <Text className="text-base font-sans-bold text-destructive">
                Capture issue
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {errorMessage}
              </Text>
            </Card>
          ) : null}

          {step === "package" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Election Package</Text>
              {isLoading ? (
                <Text className="text-sm font-sans-semibold text-muted-foreground">
                  Loading package...
                </Text>
              ) : null}
              {!isLoading && !options?.isEligible ? (
                <View className="gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
                  <StatusBadge status="under-review" label="Capture Locked" />
                  <Text className="text-sm font-sans-medium text-muted-foreground">
                    {options?.ineligibilityReason ||
                      "No open election is currently available for your approved polling unit."}
                  </Text>
                </View>
              ) : null}
              {selectedElection ? (
                <>
                  <InfoRow label="Election" value={selectedElection.electionName || "Not available"} />
                  <InfoRow label="Code" value={selectedElection.electionCode || "Not available"} />
                  <InfoRow label="Date" value={formatDate(selectedElection.electionDate)} />
                  <InfoRow label="Assigned PU" value={options?.pollingUnitName || "Not available"} />
                  <InfoRow label="Capture window" value={selectedElection.uploadWindowText || "Open"} />
                  {options?.openElections && options.openElections.length > 1 ? (
                    <View className="gap-2">
                      <Text className="text-sm font-sans-semibold text-primary">
                        Open elections
                      </Text>
                      {options.openElections.map((election) => (
                        <Pressable
                          key={election.electionId}
                          className={`rounded-xl border p-3 ${
                            election.electionId === selectedElection.electionId
                              ? "border-accent bg-accent/10"
                              : "border-border bg-background"
                          }`}
                          onPress={() => selectElection(election)}
                        >
                          <Text className="text-sm font-sans-bold text-primary">
                            {election.electionName}
                          </Text>
                          <Text className="text-xs font-sans-medium text-muted-foreground">
                            {election.uploadWindowText}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <View className="flex-row flex-wrap gap-2">
                    {parties.map((party) => (
                      <View key={party.electionPartyId} className="rounded-full bg-muted px-3 py-2">
                        <Text className="text-xs font-sans-bold text-primary">
                          {party.partyAcronym || party.partyName}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
                  <PrimaryButton
                    label="Continue"
                    disabled={!selectedElection || !options?.isEligible}
                    onPress={() => setStep("start")}
                  />
                  <SecondaryButton label="Report Incident" onPress={openIncident} />
                </Card>
              ) : null}

          {step === "start" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Capture Start</Text>
              <InfoRow label="Election" value={selectedElection?.electionName || "Not available"} />
              <InfoRow label="Polling Unit" value={options?.pollingUnitName || "Not available"} />
              <InfoRow label="State" value={options?.stateName || "Not available"} />
              <InfoRow label="LGA" value={options?.localGovernmentAreaName || "Not available"} />
              <InfoRow label="Ward" value={options?.wardName || "Not available"} />
              <InfoRow
                label="Geofence"
                value={
                  options?.allowedGeofenceRadiusMeters
                    ? `${options.allowedGeofenceRadiusMeters}m radius${options.geofenceRequired ? "" : " (advisory)"}`
                    : "Backend rule unavailable"
                }
              />
              <InfoRow
                label="Location"
                value={
                  captureLocation
                    ? `Captured (${captureLocation.accuracyMeters ?? "unknown"}m accuracy)`
                    : "Not captured"
                }
              />
              <InfoRow label="Device time" value="Device timestamp will be sent with capture" />
              <StatusBadge
                status={options?.isEligible ? "approved" : "under-review"}
                label={options?.isEligible ? "Eligible" : "Blocked"}
              />
              <PrimaryButton
                label={isStarting ? "Starting..." : "Capture EC8A Result"}
                disabled={isStarting || !selectedElection || !options?.isEligible}
                onPress={beginCapture}
              />
              <SecondaryButton label="Report Incident" onPress={openIncident} />
            </Card>
          ) : null}

          {step === "camera" ? (
            <View className="gap-4">
              <View className="min-h-[520px] overflow-hidden rounded-3xl bg-charcoal p-4">
                <View className="flex-row justify-between">
                  <StatusBadge
                    status={session?.isWithinGeofence ? "verified" : "under-review"}
                    label={
                      session?.isWithinGeofence
                        ? "GPS verified"
                        : session?.message ?? "GPS captured"
                    }
                  />
                  <StatusBadge status="saved-locally" label={session?.status || "Issued"} />
                </View>
                <View className="mt-10 flex-1 items-center justify-center rounded-2xl border-2 border-white/65">
                  {ec8aImage ? (
                    <Image source={{ uri: ec8aImage.uri }} className="h-full w-full rounded-2xl" resizeMode="cover" />
                  ) : (
                    <Text className="text-center text-base font-sans-bold text-white">
                      Align EC8A result sheet inside the guide frame
                    </Text>
                  )}
                </View>
                <View className="mt-6 flex-row items-center justify-center gap-8">
                  <SecondaryButton label="Retake" onPress={captureEc8a} />
                  <Pressable
                    className="size-20 rounded-full border-4 border-white bg-white/20"
                    onPress={captureEc8a}
                  />
                  <SecondaryButton
                    label={isAnalyzingEc8a ? "Reading..." : "Use Photo"}
                    disabled={!ec8aImage || isAnalyzingEc8a}
                    onPress={analyzeAndContinue}
                  />
                </View>
              </View>
              <SecondaryButton label="Report Incident" onPress={openIncident} />
            </View>
          ) : null}

          {step === "entry" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Result Entry</Text>
              {ec8aOcrResult ? (
                <View className="gap-3 rounded-xl border border-border bg-background p-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-sm font-sans-bold text-primary">
                      EC8A OCR
                    </Text>
                    <StatusBadge
                      status={ec8aOcrResult.passed ? "clean" : "under-review"}
                      label={ec8aOcrResult.passed ? "Read" : "Review"}
                    />
                  </View>
                  {ec8aOcrResult.issues.map((issue) => (
                    <Text key={issue} className="text-xs font-sans-semibold text-warning">
                      {issue}
                    </Text>
                  ))}
                  {ec8aOcrResult.unmatchedRows.length ? (
                    <Text className="text-xs font-sans-semibold text-muted-foreground">
                      Unknown OCR party rows were ignored:{" "}
                      {ec8aOcrResult.unmatchedRows
                        .map((row) => row.partyCode)
                        .join(", ")}
                    </Text>
                  ) : null}
                  {ec8aOcrResult.qr ? (
                    <Text className="text-xs font-sans-semibold text-muted-foreground">
                      QR: {ec8aOcrResult.qr.status}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {ec8aImage ? (
                <Image source={{ uri: ec8aImage.uri }} className="h-28 w-full rounded-xl" resizeMode="cover" />
              ) : null}
              {parties.map((party) => (
                <FormField
                  key={party.electionPartyId}
                  label={`${party.partyAcronym || "Party"} - ${party.partyName || "Election party"}`}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    setScores((current) => ({
                      ...current,
                      [party.electionPartyId]: numberOnly(value),
                    }))
                  }
                  value={scores[party.electionPartyId] ?? ""}
                />
              ))}
              <FormField label="Number of Voters on the Register" keyboardType="number-pad" value={registeredVoters} onChangeText={(value) => setRegisteredVoters(numberOnly(value))} />
              <FormField label="Number of Accredited Voters" keyboardType="number-pad" value={accreditedVoters} onChangeText={(value) => setAccreditedVoters(numberOnly(value))} />
              <FormField label="Number of Ballot Papers Issued to the Polling Unit" keyboardType="number-pad" value={ballotPapersIssued} onChangeText={(value) => setBallotPapersIssued(numberOnly(value))} />
              <FormField label="Number of Unused Ballot Papers" keyboardType="number-pad" value={unusedBallotPapers} onChangeText={(value) => setUnusedBallotPapers(numberOnly(value))} />
              <FormField label="Number of Spoiled Ballot Papers" keyboardType="number-pad" value={spoiledBallotPapers} onChangeText={(value) => setSpoiledBallotPapers(numberOnly(value))} />
              <FormField label="Number of Rejected Ballots" keyboardType="number-pad" value={rejectedVotes} onChangeText={(value) => setRejectedVotes(numberOnly(value))} />
              <FormField label="Number of Total Valid Votes" keyboardType="number-pad" value={validVotes} onChangeText={(value) => setValidVotes(numberOnly(value))} />
              <FormField label="EC8A Serial" value={serialNumber} onChangeText={setSerialNumber} placeholder="Optional" />
              <InfoRow label="Total Number of Used Ballot Papers" value={totalVotesCast} />
              {validationIssues.length ? (
                <View className="gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
                  {validationIssues.map((issue) => (
                    <Text key={issue} className="text-sm font-sans-bold text-warning">
                      {issue}
                    </Text>
                  ))}
                </View>
              ) : null}
              <FormField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Add observations..." />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton label="Back" onPress={() => setStep("camera")} />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    label="Review & Submit"
                    disabled={!canReview}
                    onPress={() => setStep("review")}
                  />
                </View>
              </View>
              <SecondaryButton label="Report Incident" onPress={openIncident} />
            </Card>
          ) : null}

          {step === "review" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Review Submission</Text>
              <InfoRow label="Election" value={selectedElection?.electionName || "Not available"} />
              <InfoRow label="Polling Unit" value={session?.pollingUnitName || options?.pollingUnitName || "Not available"} />
              <InfoRow label="Party score total" value={partyTotal} />
              <InfoRow label="Number of Voters on the Register" value={registeredVoters || "Not entered"} />
              <InfoRow label="Number of Accredited Voters" value={accreditedVoters || "Not entered"} />
              <InfoRow label="Number of Ballot Papers Issued to the Polling Unit" value={ballotPapersIssued || "Not entered"} />
              <InfoRow label="Number of Unused Ballot Papers" value={unusedBallotPapers || "Not entered"} />
              <InfoRow label="Number of Spoiled Ballot Papers" value={spoiledBallotPapers || "Not entered"} />
              <InfoRow label="Number of Rejected Ballots" value={rejectedVotes || "Not entered"} />
              <InfoRow label="Number of Total Valid Votes" value={validVotes || "Not entered"} />
              <InfoRow label="Total Number of Used Ballot Papers" value={totalVotesCast} />
              <InfoRow
                label="Location"
                value={
                  session?.distanceToPollingUnitMeters !== null &&
                  session?.distanceToPollingUnitMeters !== undefined
                    ? `${Math.round(session.distanceToPollingUnitMeters)}m from assigned polling unit`
                    : captureLocation
                      ? "Captured"
                      : "Not captured"
                }
              />
              <InfoRow label="Timestamp" value={formatDateTime(new Date().toISOString())} />
              <Text className="text-sm font-sans-medium text-muted-foreground">
                The backend will re-check your identity, KYC approval, assignment, candidate list, totals, and duplicate submission rules.
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton label="Back" disabled={isSubmitting} onPress={() => setStep("entry")} />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Submit Result"}
                    disabled={isSubmitting}
                    onPress={submitOrQueue}
                  />
                </View>
              </View>
              <SecondaryButton label="Report Incident" disabled={isSubmitting} onPress={openIncident} />
            </Card>
          ) : null}

          {step === "incident" ? (
            <>
              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">Report Incident</Text>
                {isIncidentLoading ? (
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Loading incident context...
                  </Text>
                ) : null}
                {!isIncidentLoading && incidentStart && !incidentStart.isEligible ? (
                  <View className="gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
                    <StatusBadge status="under-review" label="Incident Locked" />
                    <Text className="text-sm font-sans-medium text-muted-foreground">
                      {incidentStart.ineligibilityReason ??
                        "You will be able to report incidents once your verification and assignment are active."}
                    </Text>
                  </View>
                ) : null}
                {incidentNumber ? (
                  <View className="gap-3 rounded-xl border border-success/30 bg-success/10 p-3">
                    <StatusBadge status="synced" label="Submitted" />
                    <Text className="text-sm font-sans-medium text-muted-foreground">
                      The backend has received this incident report for review.
                    </Text>
                    <InfoRow label="Reference" value={incidentNumber} />
                  </View>
                ) : null}
                <InfoRow
                  label="Election"
                  value={selectedIncidentElection?.electionName ?? "Not available"}
                />
                <InfoRow
                  label="Polling Unit"
                  value={incidentStart?.pollingUnitName ?? options?.pollingUnitName ?? "Not available"}
                />
                <InfoRow label="State" value={incidentStart?.stateName ?? options?.stateName ?? "Not available"} />
                <InfoRow
                  label="LGA"
                  value={incidentStart?.localGovernmentAreaName ?? options?.localGovernmentAreaName ?? "Not available"}
                />
                <InfoRow label="Ward" value={incidentStart?.wardName ?? options?.wardName ?? "Not available"} />
              </Card>

              {!incidentNumber && incidentStart?.isEligible ? (
                <>
                  <Card className="gap-4">
                    <Text className="text-lg font-sans-bold text-primary">Incident details</Text>
                    <View className="gap-2">
                      <Text className="text-sm font-sans-semibold text-primary">Incident type</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {incidentTypes.map((item) => (
                          <Pressable
                            key={item.value}
                            className={`rounded-full px-3 py-2 ${
                              incidentType === item.value ? "bg-accent" : "bg-accent/10"
                            }`}
                            onPress={() => setIncidentType(item.value)}
                          >
                            <Text
                              className={`text-xs font-sans-bold ${
                                incidentType === item.value ? "text-white" : "text-accent"
                              }`}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-sans-semibold text-primary">Severity</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {severityOptions.map((item) => (
                          <Pressable
                            key={item.value}
                            className={`rounded-full px-3 py-2 ${
                              incidentSeverity === item.value ? "bg-warning" : "bg-warning/10"
                            }`}
                            onPress={() => setIncidentSeverity(item.value)}
                          >
                            <Text
                              className={`text-xs font-sans-bold ${
                                incidentSeverity === item.value ? "text-white" : "text-warning"
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
                      value={incidentDescription}
                      onChangeText={setIncidentDescription}
                      multiline
                      placeholder="Describe what happened..."
                    />
                    <FormField
                      label="Location note"
                      value={incidentLocationDescription}
                      onChangeText={setIncidentLocationDescription}
                      placeholder="Optional location detail"
                    />
                  </Card>

                  <Card className="gap-4">
                    <Text className="text-lg font-sans-bold text-primary">Evidence</Text>
                    {incidentEvidence.length ? (
                      <View className="flex-row flex-wrap gap-3">
                        {incidentEvidence.map((item) => (
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
                          onPress={() => chooseIncidentEvidence("library")}
                        />
                      </View>
                      <View className="flex-1">
                        <PrimaryButton
                          label="Use camera"
                          onPress={() => chooseIncidentEvidence("camera")}
                        />
                      </View>
                    </View>
                  </Card>

                  <Pressable
                    className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
                    onPress={() =>
                      setIncidentConfirmationAccepted((value) => !value)
                    }
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md border ${
                        incidentConfirmationAccepted
                          ? "border-accent bg-accent"
                          : "border-border bg-background"
                      }`}
                    >
                      <Text className="text-xs font-sans-bold text-white">
                        {incidentConfirmationAccepted ? "OK" : ""}
                      </Text>
                    </View>
                    <Text className="flex-1 text-sm font-sans-medium text-primary">
                      I confirm this incident report is accurate to the best of my knowledge.
                    </Text>
                  </Pressable>
                </>
              ) : null}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton
                    label="Back to Capture"
                    disabled={isIncidentSubmitting}
                    onPress={() => setStep(returnStep === "incident" ? "start" : returnStep)}
                  />
                </View>
                {!incidentNumber && incidentStart?.isEligible ? (
                  <View className="flex-1">
                    <PrimaryButton
                      label={isIncidentSubmitting ? "Submitting..." : "Submit Incident"}
                      disabled={!canSubmitIncident}
                      onPress={submitIncident}
                    />
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {step === "queued" ? (
            <Card className="items-center gap-4">
              <View className="size-20 items-center justify-center rounded-full bg-success/10">
                <Text className="text-3xl font-sans-extrabold text-success">✓</Text>
              </View>
              <Text className="text-center text-2xl font-sans-bold text-primary">
                {serverReceipt ? "Submission Received" : "Submission Queued"}
              </Text>
              <Text className="text-center text-sm font-sans-medium text-muted-foreground">
                {serverReceipt
                  ? `${serverReceipt} was confirmed by the server.`
                  : `${queuedRef} is saved locally and waiting for server sync confirmation.`}
              </Text>
              <PrimaryButton
                label="Start New Capture"
                onPress={() => {
                  setStep("package");
                  setSession(null);
                  setEc8aImage(null);
                  setServerReceipt("");
                  setQueuedRef("");
                  setIdempotencyKey(createIdempotencyKey());
                }}
              />
            </Card>
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
