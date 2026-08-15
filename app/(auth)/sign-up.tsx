import { useClerk, useSignUp } from "@clerk/expo";
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

const SignUp = () => {
  const router = useRouter();
  const { setActive } = useClerk();
  const { fetchStatus, signUp } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate =
    Boolean(emailAddress.trim() && password.length >= 8) &&
    !isSubmitting &&
    fetchStatus !== "fetching";
  const canVerify =
    code.trim().length >= 6 && !isSubmitting && fetchStatus !== "fetching";

  const handleSignUp = async () => {
    if (!signUp || !canCreate) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const { error } = await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const { error: sendCodeError } = await signUp.verifications.sendEmailCode();
      if (sendCodeError) {
        setErrorMessage(sendCodeError.message);
        return;
      }

      setPendingVerification(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!signUp || !canVerify) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await signUp.finalize();
        await setActive({ session: signUp.createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      setErrorMessage("Verification needs another step before sign-up can finish.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to verify your email right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!signUp) return null;

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
                <Text className="auth-logo-mark-text">R</Text>
              </View>
              <View>
                <Text className="auth-wordmark">Recurly</Text>
                <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
              </View>
            </View>
            <Text className="auth-title">
              {pendingVerification ? "Verify your email" : "Create account"}
            </Text>
            <Text className="auth-subtitle">
              {pendingVerification
                ? "Enter the verification code Clerk sent to your inbox."
                : "Create your first account to start tracking subscriptions."}
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
              {pendingVerification ? (
                <View className="auth-field">
                  <Text className="auth-label">Verification code</Text>
                  <TextInput
                    className="auth-input"
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={setCode}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={code}
                  />
                </View>
              ) : (
                <>
                  <View className="auth-field">
                    <Text className="auth-label">Email address</Text>
                    <TextInput
                      className="auth-input"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      onChangeText={setEmailAddress}
                      placeholder="name@example.com"
                      placeholderTextColor="rgba(0, 0, 0, 0.4)"
                      value={emailAddress}
                    />
                  </View>

                  <View className="auth-field">
                    <Text className="auth-label">Password</Text>
                    <TextInput
                      className="auth-input"
                      autoComplete="password-new"
                      onChangeText={setPassword}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor="rgba(0, 0, 0, 0.4)"
                      secureTextEntry
                      value={password}
                    />
                    <Text className="auth-helper">Minimum 8 characters required</Text>
                  </View>
                </>
              )}

              {errorMessage ? (
                <Text className="auth-error">{errorMessage}</Text>
              ) : null}

              <Pressable
                className={`auth-button ${
                  pendingVerification
                    ? !canVerify
                      ? "auth-button-disabled"
                      : ""
                    : !canCreate
                      ? "auth-button-disabled"
                      : ""
                }`}
                disabled={pendingVerification ? !canVerify : !canCreate}
                onPress={pendingVerification ? handleVerify : handleSignUp}
              >
                <Text className="auth-button-text">
                  {isSubmitting
                    ? pendingVerification
                      ? "Verifying..."
                      : "Creating..."
                    : pendingVerification
                      ? "Verify email"
                      : "Create account"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="auth-link-row">
            <Text className="auth-link-copy">Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="auth-link">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
