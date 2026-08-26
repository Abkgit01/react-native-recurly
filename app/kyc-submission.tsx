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
  analyzePvcImage,
  getAgentDashboard,
  getLgas,
  getPollingUnits,
  getStates,
  getWards,
  submitKyc,
  type AgentDashboardResponse,
  type AnalyzePvcImageResult,
  type GeographyOption,
  type KycImageAsset,
} from "@/lib/authApi";
import { useAuthSession } from "@/lib/authSession";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

type ImageSlot = "pvc" | "selfie";

const consentLabels = [
  "I consent to the processing of my KYC data.",
  "I consent to storing my PVC/voter-card image for verification.",
  "I consent to storing my selfie image for identity verification.",
];

const normalizeVoterNumber = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const getAssetName = (asset: ImagePicker.ImagePickerAsset, fallback: string) =>
  asset.fileName ?? asset.uri.split("/").pop() ?? fallback;

const toKycAsset = (
  asset: ImagePicker.ImagePickerAsset,
  fallback: string,
): KycImageAsset => ({
  uri: asset.uri,
  fileName: getAssetName(asset, fallback),
  mimeType: asset.mimeType ?? "image/jpeg",
});

const SelectionField = ({
  label,
  value,
  options,
  loading,
  disabled,
  placeholder,
  onSelect,
}: {
  label: string;
  value: GeographyOption | null;
  options: GeographyOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  onSelect: (option: GeographyOption) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-2">
      <Text className="text-sm font-sans-semibold text-primary">{label}</Text>
      <Pressable
        className={`rounded-xl border border-border bg-background px-4 py-3 ${
          disabled ? "opacity-50" : ""
        }`}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
      >
        <Text className="text-base font-sans-medium text-primary">
          {loading ? "Loading..." : value?.name ?? placeholder}
        </Text>
      </Pressable>
      {open && !disabled ? (
        <View className="max-h-56 overflow-hidden rounded-xl border border-border bg-card">
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.length ? (
              options.map((option) => (
                <Pressable
                  key={option.id}
                  className="border-b border-border px-4 py-3"
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Text className="text-sm font-sans-semibold text-primary">
                    {option.name}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="px-4 py-3 text-sm font-sans-medium text-muted-foreground">
                No options available.
              </Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const ImagePickerRow = ({
  title,
  image,
  onChoose,
  onCamera,
  cameraLabel,
}: {
  title: string;
  image: KycImageAsset | null;
  onChoose?: () => void;
  onCamera: () => void;
  cameraLabel: string;
}) => (
  <View className="gap-3">
    <Text className="text-sm font-sans-semibold text-primary">{title}</Text>
    {image ? (
      <View className="overflow-hidden rounded-xl border border-border bg-background">
        <Image source={{ uri: image.uri }} className="h-44 w-full" resizeMode="cover" />
        <Text className="px-3 py-2 text-xs font-sans-medium text-muted-foreground">
          {image.fileName}
        </Text>
      </View>
    ) : (
      <View className="rounded-xl border border-dashed border-border bg-background px-4 py-6">
        <Text className="text-center text-sm font-sans-medium text-muted-foreground">
          No image selected.
        </Text>
      </View>
    )}
    <View className="flex-row gap-3">
      {onChoose ? (
        <View className="flex-1">
          <SecondaryButton label="Choose file" onPress={onChoose} />
        </View>
      ) : null}
      <View className="flex-1">
        <PrimaryButton label={cameraLabel} onPress={onCamera} />
      </View>
    </View>
  </View>
);

export default function KYCSubmissionScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, token, user } = useAuthSession();
  const [dashboard, setDashboard] = useState<AgentDashboardResponse | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [voterNumber, setVoterNumber] = useState("");
  const [selectedState, setSelectedState] = useState<GeographyOption | null>(null);
  const [selectedLga, setSelectedLga] = useState<GeographyOption | null>(null);
  const [selectedWard, setSelectedWard] = useState<GeographyOption | null>(null);
  const [selectedPollingUnit, setSelectedPollingUnit] =
    useState<GeographyOption | null>(null);
  const [states, setStates] = useState<GeographyOption[]>([]);
  const [lgas, setLgas] = useState<GeographyOption[]>([]);
  const [wards, setWards] = useState<GeographyOption[]>([]);
  const [pollingUnits, setPollingUnits] = useState<GeographyOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingPollingUnits, setLoadingPollingUnits] = useState(false);
  const [pvcImage, setPvcImage] = useState<KycImageAsset | null>(null);
  const [selfieImage, setSelfieImage] = useState<KycImageAsset | null>(null);
  const [ocrResult, setOcrResult] = useState<AnalyzePvcImageResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consents, setConsents] = useState([false, false, false]);
  const lgaCache = useRef(new Map<number, GeographyOption[]>());
  const wardCache = useRef(new Map<number, GeographyOption[]>());
  const pollingUnitCache = useRef(new Map<number, GeographyOption[]>());

  const phoneNumber = dashboard?.phoneNumber ?? user?.phoneNumber ?? "";
  const normalizedVoterNumber = normalizeVoterNumber(voterNumber);
  const allConsents = consents.every(Boolean);
  const kycApproved = dashboard?.kycStatusCode === "ManuallyPvcVerified";
  const kycSubmitted =
    submitted || dashboard?.kycStatusCode === "Submitted" || dashboard?.kycStatus === "Submitted for Review";

  const canAnalyze =
    Boolean(
      token &&
        pvcImage &&
        normalizedVoterNumber &&
        selectedState &&
        selectedLga &&
        selectedWard &&
        selectedPollingUnit,
    ) && !isAnalyzing;

  const canSubmit =
    Boolean(
      token &&
        pvcImage &&
        selfieImage &&
        normalizedVoterNumber &&
        selectedState &&
        selectedLga &&
        selectedWard &&
        selectedPollingUnit &&
        ocrResult?.canSubmit &&
        allConsents,
    ) && !isSubmitting;

  const matchRows = useMemo(() => {
    if (!ocrResult) return [];
    return [
      {
        label: "First name",
        matched: ocrResult.matchResult.firstNameMatched,
        value: ocrResult.ocrResult.extractedFirstName ?? "Not read",
      },
      {
        label: "Last name",
        matched: ocrResult.matchResult.lastNameMatched,
        value: ocrResult.ocrResult.extractedLastName ?? "Not read",
      },
      {
        label: "VIN",
        matched: ocrResult.matchResult.vinMatched,
        value: ocrResult.ocrResult.extractedVin ?? "Not read",
      },
      {
        label: "State",
        matched: ocrResult.matchResult.stateMatched,
        value: ocrResult.ocrResult.extractedState ?? "Not read",
      },
      {
        label: "LGA",
        matched: ocrResult.matchResult.localGovernmentAreaMatched,
        value: ocrResult.ocrResult.extractedLocalGovernmentArea ?? "Not read",
      },
      {
        label: "Ward",
        matched: ocrResult.matchResult.wardMatched,
        value: ocrResult.ocrResult.extractedWard ?? "Not read",
      },
      {
        label: "Polling Unit",
        matched: ocrResult.matchResult.pollingUnitMatched,
        value: ocrResult.ocrResult.extractedPollingUnit ?? "Not read",
      },
    ];
  }, [ocrResult]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadDashboard = async () => {
      try {
        const nextDashboard = await getAgentDashboard(token);
        if (active) setDashboard(nextDashboard);
      } catch (error) {
        if (active) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Unable to load KYC status right now.",
          );
        }
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    setLoadingStates(true);
    getStates()
      .then((options) => {
        if (active) setStates(options);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load states right now.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingStates(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    let active = true;
    const cached = lgaCache.current.get(selectedState.id);
    if (cached) {
      setLgas(cached);
      return;
    }
    setLoadingLgas(true);
    getLgas(selectedState.id)
      .then((options) => {
        lgaCache.current.set(selectedState.id, options);
        if (active) setLgas(options);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load LGAs.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingLgas(false);
      });
    return () => {
      active = false;
    };
  }, [selectedState]);

  useEffect(() => {
    if (!selectedLga) return;
    let active = true;
    const cached = wardCache.current.get(selectedLga.id);
    if (cached) {
      setWards(cached);
      return;
    }
    setLoadingWards(true);
    getWards(selectedLga.id)
      .then((options) => {
        wardCache.current.set(selectedLga.id, options);
        if (active) setWards(options);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load wards.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [selectedLga]);

  useEffect(() => {
    if (!selectedWard) return;
    let active = true;
    const cached = pollingUnitCache.current.get(selectedWard.id);
    if (cached) {
      setPollingUnits(cached);
      return;
    }
    setLoadingPollingUnits(true);
    getPollingUnits(selectedWard.id)
      .then((options) => {
        pollingUnitCache.current.set(selectedWard.id, options);
        if (active) setPollingUnits(options);
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load polling units.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPollingUnits(false);
      });
    return () => {
      active = false;
    };
  }, [selectedWard]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const goToProfile = () => {
    router.replace("/(tabs)/profile");
  };

  const clearOcr = () => {
    setOcrResult(null);
    setStatusMessage("");
  };

  const selectState = (option: GeographyOption) => {
    setSelectedState(option);
    setSelectedLga(null);
    setSelectedWard(null);
    setSelectedPollingUnit(null);
    setLgas([]);
    setWards([]);
    setPollingUnits([]);
    clearOcr();
  };

  const selectLga = (option: GeographyOption) => {
    setSelectedLga(option);
    setSelectedWard(null);
    setSelectedPollingUnit(null);
    setWards([]);
    setPollingUnits([]);
    clearOcr();
  };

  const selectWard = (option: GeographyOption) => {
    setSelectedWard(option);
    setSelectedPollingUnit(null);
    setPollingUnits([]);
    clearOcr();
  };

  const setImage = (slot: ImageSlot, asset: KycImageAsset) => {
    if (slot === "pvc") {
      setPvcImage(asset);
      clearOcr();
      return;
    }
    setSelfieImage(asset);
  };

  const chooseFromLibrary = async (slot: ImageSlot) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo access to upload your PVC image for KYC.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(slot, toKycAsset(result.assets[0], `${slot}-image.jpg`));
    }
  };

  const captureWithCamera = async (slot: ImageSlot) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        slot === "selfie"
          ? "Allow camera access to capture your live selfie for KYC."
          : "Allow camera access to capture your PVC image for KYC.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      base64: false,
      cameraType:
        slot === "selfie" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(slot, toKycAsset(result.assets[0], `${slot}-capture.jpg`));
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || !token || !pvcImage || !selectedState || !selectedLga || !selectedWard || !selectedPollingUnit) {
      Alert.alert(
        "OCR check incomplete",
        "Enter voter number, select your polling hierarchy, and add a PVC image first.",
      );
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const result = await analyzePvcImage({
        token,
        pvcImage,
        enteredVin: normalizedVoterNumber,
        selectedStateId: selectedState.id,
        selectedLocalGovernmentAreaId: selectedLga.id,
        selectedWardId: selectedWard.id,
        selectedPollingUnitId: selectedPollingUnit.id,
      });
      setOcrResult(result);
      setStatusMessage(result.canSubmit ? "PVC OCR check passed." : "");
    } catch (error) {
      setOcrResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to analyze PVC image.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !canSubmit ||
      !token ||
      !pvcImage ||
      !selfieImage ||
      !selectedState ||
      !selectedLga ||
      !selectedWard ||
      !selectedPollingUnit
    ) {
      Alert.alert(
        "KYC incomplete",
        "Complete voter details, PVC OCR, selfie, and all consent items before submitting.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await submitKyc({
        token,
        voterNumber: normalizedVoterNumber,
        registeredStateId: selectedState.id,
        registeredLocalGovernmentAreaId: selectedLga.id,
        registeredWardId: selectedWard.id,
        registeredPollingUnitId: selectedPollingUnit.id,
        pvcImage,
        selfieImage,
        dataConsentAccepted: consents[0],
        pvcImageConsentAccepted: consents[1],
        selfieConsentAccepted: consents[2],
      });
      setSubmitted(response.submitted);
      setStatusMessage(response.message || "KYC submitted for review.");
      const nextDashboard = await getAgentDashboard(token).catch(() => null);
      if (nextDashboard) setDashboard(nextDashboard);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit KYC right now.",
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
            title="Submit KYC"
            subtitle="Provide voter-card details and verification images for review."
          />

          {dashboardError ? (
            <Card className="gap-2 border-warning/30 bg-warning/10">
              <Text className="text-sm font-sans-bold text-warning">
                KYC status unavailable
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {dashboardError}
              </Text>
            </Card>
          ) : null}

          {kycApproved ? (
            <Card className="gap-4 border-success/30 bg-success/5">
              <StatusBadge status="approved" label="Approved" />
              <Text className="text-xl font-sans-bold text-primary">
                KYC approved
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                Your polling-unit assignment is approved for result capture.
              </Text>
              <PrimaryButton label="Back Home" onPress={() => router.replace("/(tabs)")} />
            </Card>
          ) : null}

          {!kycApproved && kycSubmitted ? (
            <Card className="gap-4 border-warning/30 bg-warning/10">
              <StatusBadge status="under-review" label="Submitted for Review" />
              <Text className="text-xl font-sans-bold text-primary">
                Verification under review
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {statusMessage ||
                  dashboard?.onboardingMessage ||
                  "Your PVC and selfie have been submitted. Result capture will unlock after approval."}
              </Text>
              <PrimaryButton label="Back to Profile" onPress={goToProfile} />
            </Card>
          ) : null}

          {!kycApproved && !kycSubmitted ? (
            <>
              <Card className="gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xl font-sans-bold text-primary">
                    Voter details
                  </Text>
                  {dashboard?.kycStatus ? (
                    <StatusBadge
                      status={dashboard.kycStatusCode === "Rejected" ? "rejected" : "pending"}
                      label={dashboard.kycStatus}
                    />
                  ) : null}
                </View>
                {dashboard?.kycRejectionReason ? (
                  <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <Text className="text-sm font-sans-bold text-destructive">
                      {dashboard.kycRejectionReason}
                    </Text>
                  </View>
                ) : null}
                <InfoRow label="Verified phone" value={phoneNumber || "Unavailable"} />
                <FormField
                  label="Voter number / VIN"
                  value={voterNumber}
                  onChangeText={(value) => {
                    setVoterNumber(value);
                    clearOcr();
                  }}
                  placeholder="Enter voter number"
                />
                <SelectionField
                  label="State"
                  value={selectedState}
                  options={states}
                  loading={loadingStates}
                  placeholder="Select state"
                  onSelect={selectState}
                />
                <SelectionField
                  label="LGA"
                  value={selectedLga}
                  options={lgas}
                  loading={loadingLgas}
                  disabled={!selectedState}
                  placeholder="Select LGA"
                  onSelect={selectLga}
                />
                <SelectionField
                  label="Ward"
                  value={selectedWard}
                  options={wards}
                  loading={loadingWards}
                  disabled={!selectedLga}
                  placeholder="Select ward"
                  onSelect={selectWard}
                />
                <SelectionField
                  label="Polling Unit"
                  value={selectedPollingUnit}
                  options={pollingUnits}
                  loading={loadingPollingUnits}
                  disabled={!selectedWard}
                  placeholder="Select polling unit"
                  onSelect={(option) => {
                    setSelectedPollingUnit(option);
                    clearOcr();
                  }}
                />
              </Card>

              <Card className="gap-4 border-warning/30 bg-warning/10">
                <Text className="text-sm font-sans-bold text-warning">
                  Your registration name and polling hierarchy will be compared with the uploaded PVC.
                </Text>
              </Card>

              <Card className="gap-5">
                <Text className="text-xl font-sans-bold text-primary">
                  Verification images
                </Text>
                <ImagePickerRow
                  title="PVC/Voter Card Image"
                  image={pvcImage}
                  onChoose={() => chooseFromLibrary("pvc")}
                  onCamera={() => captureWithCamera("pvc")}
                  cameraLabel="Use camera"
                />
                <ImagePickerRow
                  title="Live Selfie Image"
                  image={selfieImage}
                  onCamera={() => captureWithCamera("selfie")}
                  cameraLabel="Capture selfie"
                />
              </Card>

              <Card className="gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xl font-sans-bold text-primary">
                    PVC OCR check
                  </Text>
                  {isAnalyzing ? <StatusBadge status="syncing" label="Checking" /> : null}
                  {ocrResult?.canSubmit ? <StatusBadge status="clean" label="Passed" /> : null}
                  {ocrResult && !ocrResult.canSubmit ? (
                    <StatusBadge status="issues" label="Issues" />
                  ) : null}
                </View>
                {!ocrResult ? (
                  <Text className="text-sm font-sans-medium text-muted-foreground">
                    Upload or capture the PVC image, then run the backend OCR check.
                  </Text>
                ) : null}
                {ocrResult ? (
                  <View className="gap-3 rounded-xl border border-border bg-background p-3">
                    {matchRows.map((row) => (
                      <View
                        key={row.label}
                        className="flex-row items-center justify-between gap-3"
                      >
                        <View className="min-w-0 flex-1">
                          <Text className="text-sm font-sans-semibold text-primary">
                            {row.label}
                          </Text>
                          <Text className="text-xs font-sans-medium text-muted-foreground">
                            {row.value}
                          </Text>
                        </View>
                        <StatusBadge
                          status={row.matched ? "clean" : "issues"}
                          label={row.matched ? "Match" : "Issue"}
                        />
                      </View>
                    ))}
                    <InfoRow
                      label="OCR confidence"
                      value={`${ocrResult.ocrResult.meanConfidence.toFixed(1)}%`}
                    />
                  </View>
                ) : null}
                {ocrResult?.issues.length ? (
                  <View className="gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    {ocrResult.issues.map((issue) => (
                      <Text
                        key={issue}
                        className="text-sm font-sans-semibold text-destructive"
                      >
                        {issue}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {errorMessage ? <Text className="auth-error">{errorMessage}</Text> : null}
                {statusMessage ? (
                  <Text className="text-sm font-sans-semibold text-accent">
                    {statusMessage}
                  </Text>
                ) : null}
                <PrimaryButton
                  label={isAnalyzing ? "Checking..." : "Run OCR Check"}
                  disabled={!canAnalyze}
                  onPress={handleAnalyze}
                />
              </Card>

              <Card className="gap-4">
                <Text className="text-xl font-sans-bold text-primary">Consent</Text>
                {consentLabels.map((label, index) => (
                  <Pressable
                    key={label}
                    className="flex-row items-start gap-3 py-1"
                    onPress={() =>
                      setConsents((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? !value : value,
                        ),
                      )
                    }
                  >
                    <View
                      className={`mt-0.5 size-5 rounded border ${
                        consents[index]
                          ? "border-accent bg-accent"
                          : "border-border bg-card"
                      }`}
                    >
                      {consents[index] ? (
                        <Text className="text-center text-xs font-sans-bold text-white">
                          ✓
                        </Text>
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
                  <SecondaryButton
                    label="Back"
                    disabled={isSubmitting}
                    onPress={goToProfile}
                  />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    label={isSubmitting ? "Submitting..." : "Submit KYC"}
                    disabled={!canSubmit}
                    onPress={handleSubmit}
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
