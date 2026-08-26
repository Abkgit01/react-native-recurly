import { resendPhoneOtp, verifyPhone } from "@/lib/authApi";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function OTPVerification() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phoneNumber?: string }>();
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber ?? "");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canVerify = phoneNumber.trim() && code.trim().length === 6 && !isSubmitting;

  const handleVerify = async () => {
    if (!canVerify) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await verifyPhone({
        phoneNumber: phoneNumber.trim(),
        otpCode: code.trim(),
      });
      setStatusMessage("Phone verified. You can now sign in.");
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
    if (!phoneNumber.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      await resendPhoneOtp(phoneNumber.trim());
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
      <ScrollView className="auth-scroll" contentContainerClassName="auth-content">
        <View className="auth-brand-block">
          <View className="auth-logo-mark">
            <Text className="auth-logo-mark-text">✓</Text>
          </View>
          <Text className="auth-title mt-8">Verify your phone</Text>
          <Text className="auth-subtitle">
            Enter the six-digit code sent to your phone.
          </Text>
        </View>

        <View className="auth-card">
          <View className="auth-form">
            <View className="auth-field">
              <Text className="auth-label">Phone Number</Text>
              <TextInput
                className="auth-input"
                autoComplete="tel"
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="08133811722"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={phoneNumber}
              />
            </View>
            <TextInput
              className="auth-input text-center text-2xl"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setCode}
              placeholder="000000"
              value={code}
            />
            {errorMessage ? <Text className="auth-error">{errorMessage}</Text> : null}
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
                {isSubmitting ? "Verifying..." : "Verify OTP"}
              </Text>
            </Pressable>
            <Pressable disabled={!phoneNumber.trim() || isSubmitting} onPress={handleResend}>
              <Text className="text-center text-sm font-sans-medium text-accent">
                Resend code
              </Text>
            </Pressable>
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
