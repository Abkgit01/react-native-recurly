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
import { currentElection, electionPackage, parties } from "@/assets/constants/data";
import { queueSubmission } from "@/lib/electionStore";
import { formatDate, formatDateTime, sumPartyScores } from "@/lib/utils";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
type CaptureStep = "package" | "start" | "camera" | "entry" | "review" | "queued";

export default function Capture() {
  const [step, setStep] = useState<CaptureStep>("package");
  const [scores, setScores] = useState<Record<string, string>>({
    apc: "132",
    lp: "87",
    pdp: "45",
    nnpp: "22",
    adp: "10",
  });
  const [registeredVoters, setRegisteredVoters] = useState("500");
  const [accreditedVoters, setAccreditedVoters] = useState("312");
  const [validVotes, setValidVotes] = useState("296");
  const [rejectedVotes, setRejectedVotes] = useState("16");
  const [notes, setNotes] = useState("");
  const [queuedRef, setQueuedRef] = useState("");

  const partyScores = useMemo(
    () => parties.map((party) => ({ partyId: party.id, score: Number(scores[party.id]) || 0 })),
    [scores],
  );
  const totalVotesCast = Number(validVotes || 0) + Number(rejectedVotes || 0);
  const partyTotal = sumPartyScores(partyScores);
  const hasWarning = partyTotal !== Number(validVotes || 0) || totalVotesCast !== Number(accreditedVoters || 0);

  const queueCurrentSubmission = () => {
    const submission = queueSubmission({
      election: currentElection,
      pollingUnit: electionPackage.pollingUnit,
      partyScores,
      registeredVoters: Number(registeredVoters) || 0,
      accreditedVoters: Number(accreditedVoters) || 0,
      validVotes: Number(validVotes) || 0,
      rejectedVotes: Number(rejectedVotes) || 0,
      totalVotesCast,
      notes,
    });
    setQueuedRef(submission.localReference);
    setStep("queued");
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
            subtitle="Prepare, capture EC8A evidence, enter scores, and queue securely."
          />

          <View className="flex-row gap-2">
            {["package", "start", "camera", "entry", "review", "queued"].map((item) => (
              <View
                key={item}
                className={`h-1 flex-1 rounded-full ${item === step ? "bg-accent" : "bg-muted"}`}
              />
            ))}
          </View>

          {step === "package" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Election Package</Text>
              <InfoRow label="Election" value={electionPackage.election.name} />
              <InfoRow label="Code" value={electionPackage.election.code} />
              <InfoRow label="Date" value={formatDate(electionPackage.election.date)} />
              <InfoRow label="Assigned PU" value={electionPackage.pollingUnit.name} />
              <InfoRow label="Capture window" value={electionPackage.captureWindow} />
              <InfoRow label="Last downloaded" value={formatDateTime(electionPackage.lastDownloadedAt)} />
              <StatusBadge status="saved-locally" label="Offline Ready" />
              <View className="flex-row flex-wrap gap-2">
                {parties.map((party) => (
                  <View key={party.id} className="rounded-full bg-muted px-3 py-2">
                    <Text className="text-xs font-sans-bold text-primary">{party.abbreviation}</Text>
                  </View>
                ))}
              </View>
              <PrimaryButton label="Continue" onPress={() => setStep("start")} />
            </Card>
          ) : null}

          {step === "start" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Capture Start</Text>
              <InfoRow label="Election" value={electionPackage.election.name} />
              <InfoRow label="Polling Unit" value={electionPackage.pollingUnit.name} />
              <InfoRow label="State" value={electionPackage.pollingUnit.state} />
              <InfoRow label="LGA" value={electionPackage.pollingUnit.lga} />
              <InfoRow label="Ward" value={electionPackage.pollingUnit.ward} />
              <InfoRow label="Location" value="Inside geofence, accuracy 8m" />
              <InfoRow label="Device time" value="Synced" />
              <StatusBadge status="saved-locally" label="Offline Ready" />
              <PrimaryButton label="Capture EC8A Result" onPress={() => setStep("camera")} />
            </Card>
          ) : null}

          {step === "camera" ? (
            <View className="gap-4">
              <View className="min-h-[520px] overflow-hidden rounded-3xl bg-charcoal p-4">
                <View className="flex-row justify-between">
                  <StatusBadge status="online" label="GPS 8m" />
                  <StatusBadge status="saved-locally" label="11:24 AM" />
                </View>
                <View className="mt-10 flex-1 items-center justify-center rounded-2xl border-2 border-white/65">
                  <Text className="text-center text-base font-sans-bold text-white">
                    Align EC8A result sheet inside the guide frame
                  </Text>
                </View>
                <View className="mt-6 flex-row items-center justify-center gap-8">
                  <SecondaryButton label="Retake" />
                  <Pressable
                    className="size-20 rounded-full border-4 border-white bg-white/20"
                    onPress={() => setStep("entry")}
                  />
                  <SecondaryButton label="Use Photo" onPress={() => setStep("entry")} />
                </View>
              </View>
            </View>
          ) : null}

          {step === "entry" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Result Entry</Text>
              <View className="h-28 items-center justify-center rounded-xl border border-border bg-muted">
                <Text className="text-sm font-sans-bold text-muted-foreground">EC8A thumbnail</Text>
              </View>
              {parties.map((party) => (
                <FormField
                  key={party.id}
                  label={`${party.abbreviation} - ${party.name}`}
                  keyboardType="number-pad"
                  onChangeText={(value) => setScores((current) => ({ ...current, [party.id]: value }))}
                  value={scores[party.id] ?? ""}
                />
              ))}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Registered" keyboardType="number-pad" value={registeredVoters} onChangeText={setRegisteredVoters} />
                </View>
                <View className="flex-1">
                  <FormField label="Accredited" keyboardType="number-pad" value={accreditedVoters} onChangeText={setAccreditedVoters} />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField label="Valid votes" keyboardType="number-pad" value={validVotes} onChangeText={setValidVotes} />
                </View>
                <View className="flex-1">
                  <FormField label="Rejected" keyboardType="number-pad" value={rejectedVotes} onChangeText={setRejectedVotes} />
                </View>
              </View>
              <InfoRow label="Total votes cast" value={totalVotesCast} />
              {hasWarning ? (
                <View className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                  <Text className="text-sm font-sans-bold text-warning">
                    Check totals before submitting.
                  </Text>
                  <Text className="mt-1 text-xs font-sans-medium text-muted-foreground">
                    Party total is {partyTotal}; valid votes are {validVotes}. Total votes cast should match accredited voters where required.
                  </Text>
                </View>
              ) : null}
              <FormField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Add observations..." />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton label="Save Draft" onPress={() => Alert.alert("Draft saved locally")} />
                </View>
                <View className="flex-1">
                  <PrimaryButton label="Review & Submit" onPress={() => setStep("review")} />
                </View>
              </View>
            </Card>
          ) : null}

          {step === "review" ? (
            <Card className="gap-4">
              <Text className="text-xl font-sans-bold text-primary">Review Submission</Text>
              <InfoRow label="Election" value={currentElection.name} />
              <InfoRow label="Polling Unit" value={electionPackage.pollingUnit.name} />
              <InfoRow label="Party score total" value={partyTotal} />
              <InfoRow label="Valid votes" value={validVotes} />
              <InfoRow label="Rejected votes" value={rejectedVotes} />
              <InfoRow label="Total votes cast" value={totalVotesCast} />
              <InfoRow label="GPS evidence" value="Captured, 8m accuracy" />
              <InfoRow label="Timestamp" value={formatDateTime(new Date().toISOString())} />
              <Text className="text-sm font-sans-medium text-muted-foreground">
                If offline, this submission will stay securely queued on this device until sync is available.
              </Text>
              <PrimaryButton label="Queue for Upload" onPress={queueCurrentSubmission} />
            </Card>
          ) : null}

          {step === "queued" ? (
            <Card className="items-center gap-4">
              <View className="size-20 items-center justify-center rounded-full bg-success/10">
                <Text className="text-3xl font-sans-extrabold text-success">✓</Text>
              </View>
              <Text className="text-center text-2xl font-sans-bold text-primary">
                Submission Queued
              </Text>
              <Text className="text-center text-sm font-sans-medium text-muted-foreground">
                {queuedRef} is saved locally and waiting for server sync confirmation.
              </Text>
              <PrimaryButton label="Capture Another" onPress={() => setStep("package")} />
            </Card>
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
