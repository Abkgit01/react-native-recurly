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
  getOpenResultCaptureOptions,
  startResultCaptureSession,
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
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
type CaptureStep = "package" | "start" | "camera" | "entry" | "review" | "queued";

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
  const [validVotes, setValidVotes] = useState("");
  const [rejectedVotes, setRejectedVotes] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [queuedRef, setQueuedRef] = useState("");
  const [serverReceipt, setServerReceipt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

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
    (Number(validVotes || 0) || 0) + (Number(rejectedVotes || 0) || 0);
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const registered = toNullableNumber(registeredVoters);
    const accredited = toNullableNumber(accreditedVoters);
    const valid = toNullableNumber(validVotes);
    const rejected = toNullableNumber(rejectedVotes);
    const cast = valid !== null || rejected !== null ? totalVotesCast : null;

    if (valid !== null && valid !== partyTotal) {
      issues.push(`Total valid votes must equal party-score total (${partyTotal}).`);
    }
    if (cast !== null && accredited !== null && cast > accredited) {
      issues.push("Total votes cast cannot exceed accredited voters.");
    }
    if (registered !== null && accredited !== null && accredited > registered) {
      issues.push("Accredited voters cannot exceed registered voters.");
    }
    return issues;
  }, [accreditedVoters, partyTotal, registeredVoters, rejectedVotes, totalVotesCast, validVotes]);

  const canReview =
    Boolean(ec8aImage && parties.length && parties.every((party) => scores[party.electionPartyId] !== undefined)) &&
    validationIssues.length === 0;

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
      const started = await startResultCaptureSession(token, {
        electionId: selectedElection.electionId,
        shutterCapturedAtUtc: new Date().toISOString(),
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
      totalValidVotes: toNullableNumber(validVotes),
      rejectedVotes: toNullableNumber(rejectedVotes),
      totalVotesCast:
        validVotes.trim() || rejectedVotes.trim() ? totalVotesCast : null,
      note: notes.trim() || null,
      shutterCapturedAtUtc: new Date().toISOString(),
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
              <InfoRow label="Location" value="Not captured" />
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
            </Card>
          ) : null}

          {step === "camera" ? (
            <View className="gap-4">
              <View className="min-h-[520px] overflow-hidden rounded-3xl bg-charcoal p-4">
                <View className="flex-row justify-between">
                  <StatusBadge status="pending" label="GPS not captured" />
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
                    label="Use Photo"
                    disabled={!ec8aImage}
                    onPress={() => setStep("entry")}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {step === "entry" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Result Entry</Text>
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
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Registered" keyboardType="number-pad" value={registeredVoters} onChangeText={(value) => setRegisteredVoters(numberOnly(value))} />
                </View>
                <View className="flex-1">
                  <FormField label="Accredited" keyboardType="number-pad" value={accreditedVoters} onChangeText={(value) => setAccreditedVoters(numberOnly(value))} />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Valid votes" keyboardType="number-pad" value={validVotes} onChangeText={(value) => setValidVotes(numberOnly(value))} />
                </View>
                <View className="flex-1">
                  <FormField label="Rejected" keyboardType="number-pad" value={rejectedVotes} onChangeText={(value) => setRejectedVotes(numberOnly(value))} />
                </View>
              </View>
              <FormField label="EC8A Serial" value={serialNumber} onChangeText={setSerialNumber} placeholder="Optional" />
              <InfoRow label="Total votes cast" value={totalVotesCast} />
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
            </Card>
          ) : null}

          {step === "review" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Review Submission</Text>
              <InfoRow label="Election" value={selectedElection?.electionName || "Not available"} />
              <InfoRow label="Polling Unit" value={session?.pollingUnitName || options?.pollingUnitName || "Not available"} />
              <InfoRow label="Party score total" value={partyTotal} />
              <InfoRow label="Valid votes" value={validVotes || "Not entered"} />
              <InfoRow label="Rejected votes" value={rejectedVotes || "Not entered"} />
              <InfoRow label="Total votes cast" value={totalVotesCast} />
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
            </Card>
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
