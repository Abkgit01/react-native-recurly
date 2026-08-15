import { useSignIn } from "@clerk/expo";
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
  const { fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(emailAddress.trim() && password.trim()) &&
    !isSubmitting &&
    fetchStatus !== "fetching";

  const handleSignIn = async () => {
    if (!signIn || !canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const { error } = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (signIn.status === "complete" && signIn.createdSessionId) {
        await signIn.finalize();
        router.replace("/(tabs)");
        return;
      }

      setErrorMessage("Sign in needs another step. Check your Clerk settings.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!signIn) return null;

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
            <Text className="auth-title">Welcome back</Text>
            <Text className="auth-subtitle">
              Sign in to keep tracking every subscription.
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
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
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  secureTextEntry
                  value={password}
                />
              </View>

              {errorMessage ? (
                <Text className="auth-error">{errorMessage}</Text>
              ) : null}

              <Pressable
                className={`auth-button ${!canSubmit ? "auth-button-disabled" : ""}`}
                disabled={!canSubmit}
                onPress={handleSignIn}
              >
                <Text className="auth-button-text">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="auth-link-row">
            <Text className="auth-link-copy">New to Recurly?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text className="auth-link">Create account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
