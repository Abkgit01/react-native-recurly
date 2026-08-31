import { resendPhoneOtp, verifyPhone } from "@/lib/authApi";
import { useAuthSession } from "@/lib/authSession";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInput as TextInputType,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const maskPhoneNumber = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length <= 4) return phoneNumber;
  return `${phoneNumber.slice(0, 4)} *** *** ${digits.slice(-4)}`;
};

export default function OTPVerification() {
  const router = useRouter();
  const {
    isSignedIn,
    pendingVerification,
    confirmPhoneNumber,
    user,
  } = useAuthSession();
  const phoneNumber = pendingVerification?.phoneNumber ?? user?.phoneNumber ?? "";
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputsRef = useRef<(TextInputType | null)[]>([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const canVerify =
    Boolean(phoneNumber.trim()) && code.length === OTP_LENGTH && !isSubmitting;
  const canResend = Boolean(phoneNumber.trim()) && !isSubmitting && cooldown === 0;

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setCodeFromText = (text: string, index: number) => {
    setErrorMessage("");
    setStatusMessage("");
    const nextDigits = text.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");

    if (nextDigits.length > 1) {
      const next = Array(OTP_LENGTH).fill("");
      nextDigits.forEach((digit, digitIndex) => {
        next[digitIndex] = digit;
      });
      setDigits(next);
      inputsRef.current[Math.min(nextDigits.length, OTP_LENGTH) - 1]?.focus();
      return;
    }

    setDigits((current) => {
      const next = [...current];
      next[index] = nextDigits[0] ?? "";
      return next;
    });

    if (nextDigits[0] && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key !== "Backspace" || digits[index] || index === 0) return;
    inputsRef.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    if (!canVerify) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await verifyPhone({
        phoneNumber: phoneNumber.trim(),
        otpCode: code,
      });
      setDigits(Array(OTP_LENGTH).fill(""));

      if (isSignedIn) {
        const nextRoute = await confirmPhoneNumber();
        router.replace(nextRoute);
        return;
      }

      setStatusMessage("Phone verified. Login to continue KYC.");
      router.replace("/(auth)/sign-in");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify OTP right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await resendPhoneOtp(phoneNumber.trim());
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatusMessage("Verification code resent.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to resend OTP right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="auth-safe-area">
      <ScrollView
        className="auth-scroll"
        contentContainerClassName="auth-content"
        keyboardShouldPersistTaps="handled"
      >
        <View className="auth-brand-block">
          <View className="auth-logo-mark">
            <Text className="auth-logo-mark-text">✓</Text>
          </View>
          <Text className="auth-title mt-8">Verify your phone</Text>
          <Text className="auth-subtitle">
            {phoneNumber
              ? `Enter the six-digit code sent to ${maskPhoneNumber(phoneNumber)}.`
              : "Register or login first to receive a verification code."}
          </Text>
        </View>

        <View className="auth-card">
          <View className="auth-form">
            {phoneNumber ? (
              <>
                <View className="flex-row justify-between gap-2">
                  {digits.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(input) => {
                        inputsRef.current[index] = input;
                      }}
                      className="h-12 flex-1 rounded-xl border border-border bg-background text-lg font-sans-bold text-primary"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      keyboardType="number-pad"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      onChangeText={(text) => setCodeFromText(text, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleBackspace(nativeEvent.key, index)
                      }
                      selectTextOnFocus
                      style={{ textAlign: "center" }}
                      textContentType="oneTimeCode"
                      value={digit}
                    />
                  ))}
                </View>

                {errorMessage ? (
                  <Text className="auth-error">{errorMessage}</Text>
                ) : null}
                {statusMessage ? (
                  <Text className="text-center text-sm font-sans-medium text-accent">
                    {statusMessage}
                  </Text>
                ) : null}

                <Pressable
                  className={`auth-button ${!canVerify ? "auth-button-disabled" : ""}`}
                  disabled={!canVerify}
                  onPress={handleVerify}
                >
                  <Text className="auth-button-text">
                    {isSubmitting ? "Verifying..." : "Verify phone"}
                  </Text>
                </Pressable>

                <Pressable disabled={!canResend} onPress={handleResend}>
                  <Text className="text-center text-sm font-sans-medium text-accent">
                    {cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : "Didn't receive the code? Resend code"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-center text-sm font-sans-medium text-muted-foreground">
                  No pending phone verification was found on this device.
                </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Pressable className="auth-button">
                    <Text className="auth-button-text">Register</Text>
                  </Pressable>
                </Link>
              </>
            )}

            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="text-center text-sm font-sans-bold text-muted-foreground">
                  Change number
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
