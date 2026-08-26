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

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_ELECTION_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:5253"
).replace(/\/$/, "");

const unwrapApiResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  const success = body?.success ?? body?.Success ?? response.ok;
  const data = body?.data ?? body?.Data;
  const errorMessage =
    body?.errorMessage ??
    body?.ErrorMessage ??
    `Request failed with status ${response.status}.`;

  if (!response.ok || !success || !data) {
    throw new Error(errorMessage);
  }

  return data;
};

const postJson = async <T>(path: string, payload: unknown): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    throw new Error(
      "Unable to reach ElectionApp API. Make sure the backend is running and reachable from this device.",
    );
  });

  return unwrapApiResponse<T>(response);
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
