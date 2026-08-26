import { getAgentDashboard, login } from "@/lib/authApi";
import { useAuthSession } from "@/lib/authSession";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const SignIn = () => {
  const router = useRouter();
  const { saveLoginSession, savePendingVerification } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(identifier.trim() && password.trim()) && !isSubmitting;

  const handleSignIn = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const session = await login({
        userNameOrEmail: identifier.trim(),
        password,
      });

      await saveLoginSession(session);
      if (!session.phoneNumberConfirmed && session.phoneNumber) {
        await savePendingVerification({
          email: session.email,
          fullName: session.fullName,
          phoneNumber: session.phoneNumber,
        });
        router.replace("/(auth)/otp");
        return;
      }

      const dashboard = await getAgentDashboard(session.token).catch(() => null);
      if (dashboard && !dashboard.kycApproved) {
        router.replace("/kyc-submission");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="auth-safe-area">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="auth-screen"
      >
        <ScrollView
          className="auth-scroll"
          contentContainerClassName="auth-content"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-brand-block">
            <View className="auth-logo-wrap">
              <View className="auth-logo-mark">
                <Text className="auth-logo-mark-text">✓</Text>
              </View>
              <View>
                <Text className="auth-wordmark">ElectionWatch</Text>
                <Text className="auth-wordmark-sub">
                  Secure. Transparent. Trusted.
                </Text>
              </View>
            </View>
            <Text className="auth-title">Welcome back</Text>
            <Text className="auth-subtitle">
              Sign in to continue election monitoring.
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
              <View className="auth-field">
                <Text className="auth-label">Email</Text>
                <TextInput
                  className="auth-input"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setIdentifier}
                  placeholder="agent@example.com"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={identifier}
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Password</Text>
                <TextInput
                  className="auth-input"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  secureTextEntry
                  value={password}
                />
              </View>

              {errorMessage ? <Text className="auth-error">{errorMessage}</Text> : null}

              <Pressable
                className={`auth-button ${!canSubmit ? "auth-button-disabled" : ""}`}
                disabled={!canSubmit}
                onPress={handleSignIn}
              >
                <Text className="auth-button-text">
                  {isSubmitting ? "Logging in..." : "Login"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="auth-link-row">
            <Text className="auth-link-copy">Forgot password?</Text>
            <Link href="/(auth)/otp" asChild>
              <Pressable>
                <Text className="auth-link">Continue with OTP</Text>
              </Pressable>
            </Link>
          </View>

          <View className="auth-link-row">
            <Text className="auth-link-copy">New to ElectionWatch?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text className="auth-link">Register</Text>
              </Pressable>
            </Link>
          </View>

          <View className="auth-link-row">
            <Link href="/public-results" asChild>
              <Pressable>
                <Text className="auth-link">View Public Results</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
