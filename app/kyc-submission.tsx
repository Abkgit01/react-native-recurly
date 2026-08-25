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
import { currentAgent } from "@/assets/constants/data";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
type OcrState = "idle" | "checking" | "issues" | "passed" | "submitted";

const consentLabels = [
  "I consent to the processing of my KYC data.",
  "I consent to storing my PVC/voter-card image for verification.",
  "I consent to storing my selfie image for identity verification.",
];

export default function KYCSubmissionScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [phone, setPhone] = useState(currentAgent.phone);
  const [voterNumber, setVoterNumber] = useState("PVC-TEST-AD-SG-KES-0001");
  const [stateName, setStateName] = useState("ADAMAWA");
  const [lga, setLga] = useState("SONG");
  const [ward, setWard] = useState("SIGIRE");
  const [pollingUnit, setPollingUnit] = useState("KESURE");
  const [pvcImage, setPvcImage] = useState("");
  const [selfieImage, setSelfieImage] = useState("");
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [consents, setConsents] = useState([false, false, false]);

  const allConsents = consents.every(Boolean);
  const canSubmit =
    phone.trim() &&
    voterNumber.trim() &&
    stateName.trim() &&
    lga.trim() &&
    ward.trim() &&
    pollingUnit.trim() &&
    pvcImage.trim() &&
    selfieImage.trim() &&
    ocrState === "passed" &&
    allConsents;

  const ocrRows = useMemo(
    () => [
      ["First name", "Account first name", "ABUBAKAR"],
      ["Last name", "Account last name", "IBRAHIM"],
      ["VIN", voterNumber, voterNumber.replace(/-/g, "")],
      ["State", stateName, stateName],
      ["LGA", lga, lga],
      ["Ward", ward, ward],
      ["Polling Unit", pollingUnit, pollingUnit],
    ],
    [lga, pollingUnit, stateName, voterNumber, ward],
  );

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const runOcrCheck = (nextState: OcrState) => {
    setOcrState("checking");
    setTimeout(() => setOcrState(nextState), 600);
  };

  const submitKyc = () => {
    if (!canSubmit) {
      Alert.alert("KYC incomplete", "Complete voter details, evidence, OCR check, and consent before submitting.");
      return;
    }

    setOcrState("submitted");
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
            title="Submit KYC"
            subtitle="Provide voter-card details and verification images for review."
          />

          {ocrState === "submitted" ? (
            <Card className="gap-4 border-warning/30 bg-warning/10">
              <StatusBadge status="under-review" label="Submitted for Review" />
              <Text className="text-xl font-sans-bold text-primary">
                Verification under review
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                Your PVC and selfie have been submitted. Result capture will unlock after approval.
              </Text>
              <PrimaryButton label="Back to Profile" onPress={() => router.back()} />
            </Card>
          ) : null}

          {ocrState !== "submitted" ? (
            <>
              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Voter details
                </Text>
                <Text className="text-sm font-sans-medium text-muted-foreground">
                  Select the polling hierarchy from the seeded INEC geography data.
                </Text>
                <FormField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <FormField label="Voter number" value={voterNumber} onChangeText={setVoterNumber} />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormField label="State" value={stateName} onChangeText={setStateName} />
                  </View>
                  <View className="flex-1">
                    <FormField label="LGA" value={lga} onChangeText={setLga} />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormField label="Ward" value={ward} onChangeText={setWard} />
                  </View>
                  <View className="flex-1">
                    <FormField label="Polling Unit" value={pollingUnit} onChangeText={setPollingUnit} />
                  </View>
                </View>
              </Card>

              <Card className="gap-4 border-warning/30 bg-warning/10">
                <Text className="text-sm font-sans-bold text-warning">
                  Your name and polling hierarchy will be compared with the uploaded PVC.
                </Text>
              </Card>

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">
                  Verification images
                </Text>
                <FormField
                  label="PVC/Voter Card Image"
                  value={pvcImage}
                  onChangeText={setPvcImage}
                  placeholder="Enter image filename or local reference"
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <PrimaryButton label="Upload" onPress={() => setPvcImage("pvc-image-local.jpg")} />
                  </View>
                  <View className="flex-1">
                    <SecondaryButton label="Use camera" onPress={() => setPvcImage("pvc-camera-capture.jpg")} />
                  </View>
                </View>

                <FormField
                  label="Live Selfie Image"
                  value={selfieImage}
                  onChangeText={setSelfieImage}
                  placeholder="Enter selfie filename or local reference"
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <SecondaryButton label="Start camera" />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton label="Capture selfie" onPress={() => setSelfieImage("selfie-capture-local.jpg")} />
                  </View>
                </View>
              </Card>

              <Card className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-sans-bold text-primary">
                    PVC OCR check
                  </Text>
                  {ocrState === "checking" ? <StatusBadge status="syncing" label="Checking" /> : null}
                  {ocrState === "passed" ? <StatusBadge status="clean" label="Passed" /> : null}
                  {ocrState === "issues" ? <StatusBadge status="issues" label="Issues" /> : null}
                </View>
                {ocrState === "idle" ? (
                  <Text className="text-sm font-sans-medium text-muted-foreground">
                    Upload or capture the PVC image. Submit unlocks only after name, VIN, and location match.
                  </Text>
                ) : null}
                {ocrState === "checking" ? (
                  <Text className="text-sm font-sans-medium text-muted-foreground">
                    Reading the PVC image and comparing name, VIN, state, LGA, ward, and polling unit.
                  </Text>
                ) : null}
                {ocrState === "issues" ? (
                  <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <Text className="text-sm font-sans-bold text-destructive">
                      PVC image has issues. Retake or upload a clearer matching PVC image.
                    </Text>
                    <Text className="mt-2 text-xs font-sans-medium text-destructive">
                      OCR confidence is below the configured threshold and selected details do not fully match the PVC.
                    </Text>
                  </View>
                ) : null}
                {ocrState === "passed" ? (
                  <View className="gap-2 rounded-xl border border-success/30 bg-success/5 p-3">
                    {ocrRows.map(([label, selected, pvc]) => (
                      <InfoRow key={label} label={label} value={`${selected} / ${pvc}`} />
                    ))}
                    <InfoRow label="OCR confidence" value="92.0%" />
                  </View>
                ) : null}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <SecondaryButton label="Show issue state" onPress={() => runOcrCheck("issues")} />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton label="Run check" onPress={() => runOcrCheck("passed")} />
                  </View>
                </View>
              </Card>

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">Consent</Text>
                {consentLabels.map((label, index) => (
                  <Pressable
                    key={label}
                    className="flex-row items-center gap-3 py-1"
                    onPress={() =>
                      setConsents((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? !value : value,
                        ),
                      )
                    }
                  >
                    <View className={`size-5 rounded border ${consents[index] ? "border-accent bg-accent" : "border-border bg-card"}`}>
                      {consents[index] ? (
                        <Text className="text-center text-xs font-sans-bold text-white">✓</Text>
                      ) : null}
                    </View>
                    <Text className="min-w-0 flex-1 text-sm font-sans-medium text-primary">
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </Card>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <SecondaryButton label="Back" onPress={() => router.back()} />
                </View>
                <View className="flex-1">
                  <PrimaryButton label="Submit KYC" disabled={!canSubmit} onPress={submitKyc} />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}
