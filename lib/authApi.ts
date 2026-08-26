type ApiResponse<T> = {
  success?: boolean;
  Success?: boolean;
  errorMessage?: string | null;
  ErrorMessage?: string | null;
  data?: T | null;
  Data?: T | null;
};

export type RegisterAgentRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

export type RegisterAgentResponse = {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  requiresPhoneVerification: boolean;
  message: string;
};

export type LoginRequest = {
  userNameOrEmail: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  phoneNumberConfirmed: boolean;
  accountStatus: string;
  roles: string[];
};

export type VerifyPhoneRequest = {
  phoneNumber: string;
  otpCode: string;
};

export type VerifyPhoneResponse = {
  phoneNumber: string;
  phoneVerified: boolean;
  message: string;
};

export type GeographyOption = {
  id: number;
  name: string;
};

export type AgentDashboardResponse = {
  userId: number;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  isPhoneVerified: boolean;
  accountStatus?: string | null;
  kycStatus?: string | null;
  kycStatusCode?: string | null;
  kycApproved: boolean;
  kycSubmittedAtUtc?: string | null;
  kycReviewedAtUtc?: string | null;
  kycRejectionReason?: string | null;
  registeredStateName?: string | null;
  registeredLocalGovernmentAreaName?: string | null;
  registeredWardName?: string | null;
  registeredPollingUnitName?: string | null;
  onboardingStatus: string;
  onboardingMessage: string;
  startCaptureEnabled: boolean;
  startCaptureDisabledReason?: string | null;
  visibleElectionCount: number;
  openElectionCount: number;
  nextUploadClosesAtUtc?: string | null;
  nextUploadWindowText?: string | null;
  submissionCount: number;
  recentSubmissions?: AgentRecentSubmission[] | null;
};

export type AgentRecentSubmission = {
  resultSubmissionId: number;
  electionName: string;
  pollingUnitName: string;
  status: string;
  receiptCode: string;
  submittedAtUtc: string;
};

export type PvcSelectedLocation = {
  stateId: number;
  stateName: string;
  localGovernmentAreaId: number;
  localGovernmentAreaName: string;
  wardId: number;
  wardName: string;
  pollingUnitId: number;
  pollingUnitName: string;
  pollingUnitCode?: string | null;
};

export type PvcOcrResult = {
  provider: string;
  rawText: string;
  meanConfidence: number;
  extractedFirstName?: string | null;
  extractedLastName?: string | null;
  extractedVin?: string | null;
  extractedState?: string | null;
  extractedLocalGovernmentArea?: string | null;
  extractedWard?: string | null;
  extractedPollingUnit?: string | null;
  issues: string[];
  hasIssues: boolean;
};

export type PvcOcrMatchResult = {
  firstNameMatched: boolean;
  lastNameMatched: boolean;
  vinMatched: boolean;
  stateMatched: boolean;
  localGovernmentAreaMatched: boolean;
  wardMatched: boolean;
  pollingUnitMatched: boolean;
};

export type AnalyzePvcImageResult = {
  enteredVin: string;
  selectedLocation: PvcSelectedLocation;
  ocrResult: PvcOcrResult;
  matchResult: PvcOcrMatchResult;
  issues: string[];
  duplicateVinContributors: unknown[];
  hasDuplicateVin: boolean;
  canSubmit: boolean;
};

export type KycImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type AnalyzePvcImageRequest = {
  token: string;
  pvcImage: KycImageAsset;
  enteredVin: string;
  selectedStateId: number;
  selectedLocalGovernmentAreaId: number;
  selectedWardId: number;
  selectedPollingUnitId: number;
};

export type SubmitKycRequest = {
  token: string;
  voterNumber: string;
  registeredStateId: number;
  registeredLocalGovernmentAreaId: number;
  registeredWardId: number;
  registeredPollingUnitId: number;
  pvcImage: KycImageAsset;
  selfieImage: KycImageAsset;
  dataConsentAccepted: boolean;
  pvcImageConsentAccepted: boolean;
  selfieConsentAccepted: boolean;
};

export type SubmitKycResponse = {
  phoneNumber: string;
  submitted: boolean;
  message: string;
};

export type ResultCaptureElectionOption = {
  electionId: number;
  electionName?: string | null;
  electionCode?: string | null;
  electionDate: string;
  opensAtUtc?: string | null;
  closesAtUtc?: string | null;
  uploadWindowText?: string | null;
};

export type ResultCapturePartyScore = {
  electionPartyId: number;
  partyAcronym?: string | null;
  partyName?: string | null;
  ballotPosition: number;
  score?: number | null;
};

export type OpenResultCaptureOptionsResponse = {
  isEligible: boolean;
  ineligibilityReason?: string | null;
  selectedElectionId?: number | null;
  isAutoSelected: boolean;
  pollingUnitName?: string | null;
  pollingUnitCode?: string | null;
  wardName?: string | null;
  localGovernmentAreaName?: string | null;
  stateName?: string | null;
  openElections?: ResultCaptureElectionOption[] | null;
  partyScores?: ResultCapturePartyScore[] | null;
};

export type StartCaptureSessionRequest = {
  electionId: number;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  shutterCapturedAtUtc?: string | null;
  deviceId?: string | null;
  idempotencyKey?: string | null;
};

export type ResultCaptureSessionStart = {
  captureSessionId: number;
  electionId: number;
  pollingUnitId: number;
  pollingUnitName: string;
  pollingUnitCode?: string | null;
  wardName: string;
  localGovernmentAreaName: string;
  stateName: string;
  startedAtUtc: string;
  expiresAtUtc: string;
  status: string;
  isWithinGeofence: boolean;
  distanceToPollingUnitMeters?: number | null;
  message?: string | null;
};

export type SubmitResultCaptureRequest = {
  token: string;
  captureSessionId: number;
  electionId: number;
  ec8aImage: KycImageAsset;
  imageSource: "LiveCapture" | "ManualUpload";
  manualUploadReason?: string | null;
  ec8aSerialNumber?: string | null;
  registeredVoters?: number | null;
  accreditedVoters?: number | null;
  totalValidVotes?: number | null;
  rejectedVotes?: number | null;
  totalVotesCast?: number | null;
  note?: string | null;
  shutterLatitude?: number | null;
  shutterLongitude?: number | null;
  shutterAccuracyMeters?: number | null;
  shutterCapturedAtUtc?: string | null;
  idempotencyKey?: string | null;
  partyScores: ResultCapturePartyScore[];
};

export type SubmitResultCaptureResponse = {
  resultSubmissionId: number;
  receiptCode: string;
  calculatedPartyScoreTotal: number;
};

export type ResultSubmissionListItem = {
  resultSubmissionId: number;
  electionId: number;
  electionName: string;
  pollingUnitId: number;
  pollingUnitName: string;
  submittedAtUtc: string;
  status: string;
  needsReview: boolean;
  calculatedPartyScoreTotal: number;
  reviewStatus?: string | null;
};

export type IncidentElectionOption = ResultCaptureElectionOption;

export type IncidentStartResponse = {
  isEligible: boolean;
  ineligibilityReason?: string | null;
  selectedElectionId?: number | null;
  pollingUnitName?: string | null;
  pollingUnitCode?: string | null;
  wardName?: string | null;
  localGovernmentAreaName?: string | null;
  stateName?: string | null;
  eligibleElections?: IncidentElectionOption[] | null;
};

export type IncidentAttachmentAsset = KycImageAsset;

export type SubmitIncidentRequest = {
  token: string;
  electionId: number;
  type: number;
  severity: number;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationDescription?: string | null;
  incidentHappenedAtUtc?: string | null;
  confirmationAccepted: boolean;
  attachments: IncidentAttachmentAsset[];
};

export type SubmitIncidentResponse = {
  incidentReportId: number;
  incidentNumber: string;
  message: string;
};

export const apiBaseUrl = (
  process.env.EXPO_PUBLIC_ELECTION_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://btreexadmin-001-site3.site4future.com"
).replace(/\/$/, "");

const toErrorMessage = (response: Response, body: ApiResponse<unknown> | null) =>
  body?.errorMessage ??
  body?.ErrorMessage ??
  `Request failed with status ${response.status}.`;

const readBody = async <T>(response: Response): Promise<ApiResponse<T> | null> => {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: response.ok,
      data: text as T,
      errorMessage: response.ok ? null : text,
    };
  }
};

const unwrapApiResponse = async <T>(response: Response): Promise<T> => {
  const body = await readBody<T>(response);
  const success = body?.success ?? body?.Success ?? response.ok;
  const data = body?.data ?? body?.Data;

  if (!response.ok || !success || data === null || data === undefined) {
    throw new Error(toErrorMessage(response, body));
  }

  return data;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: BodyInit | null;
  token?: string;
  contentType?: string;
};

const apiRequest = async <T>(
  path: string,
  { method = "GET", body, token, contentType }: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (contentType) headers["Content-Type"] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body,
  }).catch(() => {
    throw new Error(
      "Unable to reach ElectionApp API. Check your internet connection and try again.",
    );
  });

  return unwrapApiResponse<T>(response);
};

const postJson = <T>(path: string, payload: unknown, token?: string) =>
  apiRequest<T>(path, {
    method: "POST",
    token,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });

const appendImage = (formData: FormData, key: string, image: KycImageAsset) => {
  formData.append(key, {
    uri: image.uri,
    name: image.fileName ?? `${key}.jpg`,
    type: image.mimeType ?? "image/jpeg",
  } as unknown as Blob);
};

export const registerAgent = (payload: RegisterAgentRequest) =>
  postJson<RegisterAgentResponse>("/api/Account/register", payload);

export const login = (payload: LoginRequest) =>
  postJson<LoginResponse>("/api/Account/login", payload);

export const verifyPhone = (payload: VerifyPhoneRequest) =>
  postJson<VerifyPhoneResponse>("/api/Account/verify-phone", payload);

export const resendPhoneOtp = (phoneNumber: string) =>
  postJson<{ phoneNumber: string; message: string }>(
    "/api/Account/resend-phone-otp",
    { phoneNumber },
  );

export const getAgentDashboard = (token: string) =>
  apiRequest<AgentDashboardResponse>("/api/agent/dashboard", { token });

export const getStates = () =>
  apiRequest<GeographyOption[]>("/api/geography/states");

export const getLgas = (stateId: number) =>
  apiRequest<GeographyOption[]>(`/api/geography/lgas?stateId=${stateId}`);

export const getWards = (lgaId: number) =>
  apiRequest<GeographyOption[]>(`/api/geography/wards?lgaId=${lgaId}`);

export const getPollingUnits = (wardId: number) =>
  apiRequest<GeographyOption[]>(
    `/api/geography/polling-units?wardId=${wardId}`,
  );

export const getOpenResultCaptureOptions = (token: string, electionId?: number) =>
  apiRequest<OpenResultCaptureOptionsResponse>(
    `/api/result-submissions/open-elections${
      electionId ? `?electionId=${electionId}` : ""
    }`,
    { token },
  );

export const getResultCaptureEligibility = (token: string, electionId?: number) =>
  apiRequest<OpenResultCaptureOptionsResponse>(
    `/api/result-submissions/eligibility${
      electionId ? `?electionId=${electionId}` : ""
    }`,
    { token },
  );

export const startResultCaptureSession = (
  token: string,
  payload: StartCaptureSessionRequest,
) =>
  postJson<ResultCaptureSessionStart>(
    "/api/result-submissions/start-capture",
    payload,
    token,
  );

export const getMyResultSubmissions = (token: string) =>
  apiRequest<ResultSubmissionListItem[]>("/api/result-submissions/my", {
    token,
  });

export const analyzePvcImage = ({
  token,
  pvcImage,
  enteredVin,
  selectedStateId,
  selectedLocalGovernmentAreaId,
  selectedWardId,
  selectedPollingUnitId,
}: AnalyzePvcImageRequest) => {
  const formData = new FormData();
  appendImage(formData, "PvcImage", pvcImage);
  formData.append("EnteredVin", enteredVin);
  formData.append("SelectedStateId", String(selectedStateId));
  formData.append(
    "SelectedLocalGovernmentAreaId",
    String(selectedLocalGovernmentAreaId),
  );
  formData.append("SelectedWardId", String(selectedWardId));
  formData.append("SelectedPollingUnitId", String(selectedPollingUnitId));

  return apiRequest<AnalyzePvcImageResult>("/api/Account/analyze-pvc-image", {
    method: "POST",
    token,
    body: formData,
  });
};

export const submitKyc = ({
  token,
  voterNumber,
  registeredStateId,
  registeredLocalGovernmentAreaId,
  registeredWardId,
  registeredPollingUnitId,
  pvcImage,
  selfieImage,
  dataConsentAccepted,
  pvcImageConsentAccepted,
  selfieConsentAccepted,
}: SubmitKycRequest) => {
  const formData = new FormData();
  formData.append("VoterNumber", voterNumber);
  formData.append("RegisteredStateId", String(registeredStateId));
  formData.append(
    "RegisteredLocalGovernmentAreaId",
    String(registeredLocalGovernmentAreaId),
  );
  formData.append("RegisteredWardId", String(registeredWardId));
  formData.append("RegisteredPollingUnitId", String(registeredPollingUnitId));
  appendImage(formData, "PvcImage", pvcImage);
  appendImage(formData, "SelfieImage", selfieImage);
  formData.append("DataConsentAccepted", String(dataConsentAccepted));
  formData.append("PvcImageConsentAccepted", String(pvcImageConsentAccepted));
  formData.append("SelfieConsentAccepted", String(selfieConsentAccepted));

  return apiRequest<SubmitKycResponse>("/api/Account/submit-kyc", {
    method: "POST",
    token,
    body: formData,
  });
};

export const submitResultCapture = ({
  token,
  captureSessionId,
  electionId,
  ec8aImage,
  imageSource,
  manualUploadReason,
  ec8aSerialNumber,
  registeredVoters,
  accreditedVoters,
  totalValidVotes,
  rejectedVotes,
  totalVotesCast,
  note,
  shutterLatitude,
  shutterLongitude,
  shutterAccuracyMeters,
  shutterCapturedAtUtc,
  idempotencyKey,
  partyScores,
}: SubmitResultCaptureRequest) => {
  const formData = new FormData();
  formData.append("CaptureSessionId", String(captureSessionId));
  formData.append("ElectionId", String(electionId));
  appendImage(formData, "Ec8aImage", ec8aImage);
  formData.append("ImageSource", imageSource);
  if (manualUploadReason) formData.append("ManualUploadReason", manualUploadReason);
  if (ec8aSerialNumber) formData.append("Ec8aSerialNumber", ec8aSerialNumber);
  if (registeredVoters !== null && registeredVoters !== undefined) {
    formData.append("RegisteredVoters", String(registeredVoters));
  }
  if (accreditedVoters !== null && accreditedVoters !== undefined) {
    formData.append("AccreditedVoters", String(accreditedVoters));
  }
  if (totalValidVotes !== null && totalValidVotes !== undefined) {
    formData.append("TotalValidVotes", String(totalValidVotes));
  }
  if (rejectedVotes !== null && rejectedVotes !== undefined) {
    formData.append("RejectedVotes", String(rejectedVotes));
  }
  if (totalVotesCast !== null && totalVotesCast !== undefined) {
    formData.append("TotalVotesCast", String(totalVotesCast));
  }
  if (note) formData.append("Note", note);
  if (shutterLatitude !== null && shutterLatitude !== undefined) {
    formData.append("ShutterLatitude", String(shutterLatitude));
  }
  if (shutterLongitude !== null && shutterLongitude !== undefined) {
    formData.append("ShutterLongitude", String(shutterLongitude));
  }
  if (shutterAccuracyMeters !== null && shutterAccuracyMeters !== undefined) {
    formData.append("ShutterAccuracyMeters", String(shutterAccuracyMeters));
  }
  if (shutterCapturedAtUtc) {
    formData.append("ShutterCapturedAtUtc", shutterCapturedAtUtc);
  }
  if (idempotencyKey) formData.append("IdempotencyKey", idempotencyKey);
  formData.append("PartyScoresJson", JSON.stringify(partyScores));

  return apiRequest<SubmitResultCaptureResponse>("/api/result-submissions", {
    method: "POST",
    token,
    body: formData,
  });
};

export const getIncidentStart = (token: string, electionId?: number) =>
  apiRequest<IncidentStartResponse>(
    `/api/incidents/start${electionId ? `?electionId=${electionId}` : ""}`,
    { token },
  );

export const submitIncidentReport = ({
  token,
  electionId,
  type,
  severity,
  description,
  latitude,
  longitude,
  locationAccuracyMeters,
  locationDescription,
  incidentHappenedAtUtc,
  confirmationAccepted,
  attachments,
}: SubmitIncidentRequest) => {
  const formData = new FormData();
  formData.append("ElectionId", String(electionId));
  formData.append("Type", String(type));
  formData.append("Severity", String(severity));
  formData.append("Description", description);
  if (latitude !== null && latitude !== undefined) {
    formData.append("Latitude", String(latitude));
  }
  if (longitude !== null && longitude !== undefined) {
    formData.append("Longitude", String(longitude));
  }
  if (locationAccuracyMeters !== null && locationAccuracyMeters !== undefined) {
    formData.append("LocationAccuracyMeters", String(locationAccuracyMeters));
  }
  if (locationDescription) {
    formData.append("LocationDescription", locationDescription);
  }
  if (incidentHappenedAtUtc) {
    formData.append("IncidentHappenedAtUtc", incidentHappenedAtUtc);
  }
  formData.append("ConfirmationAccepted", String(confirmationAccepted));
  attachments.forEach((attachment) =>
    appendImage(formData, "Attachments", attachment),
  );

  return apiRequest<SubmitIncidentResponse>("/api/incidents", {
    method: "POST",
    token,
    body: formData,
  });
};
