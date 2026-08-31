import { registerAgent } from "@/lib/authApi";
import { useAuthSession } from "@/lib/authSession";
import { Link, Redirect, useRouter } from "expo-router";
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
  const { getPostAuthRoute, isSignedIn, savePendingVerification } =
    useAuthSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate =
    Boolean(
      firstName.trim() &&
        lastName.trim() &&
        emailAddress.trim() &&
        phoneNumber.trim() &&
        password.length >= 8 &&
        confirmPassword &&
        acceptTerms,
    ) && !isSubmitting;

  if (isSignedIn) return <Redirect href={getPostAuthRoute()} />;

  const validateForm = () => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!emailAddress.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) {
      return "Enter a valid email address.";
    }
    if (!phoneNumber.trim()) return "Phone number is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!acceptTerms) return "You must accept the Terms and Privacy Policy.";
    return "";
  };

  const handleSignUp = async () => {
    if (!canCreate) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const registration = await registerAgent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailAddress.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        confirmPassword,
      });

      if (registration.requiresPhoneVerification) {
        await savePendingVerification({
          email: registration.email,
          fullName: registration.fullName,
          phoneNumber: registration.phoneNumber,
        });
        router.push("/(auth)/otp");
        return;
      }

      router.replace("/(auth)/sign-in");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register right now.",
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
              <Text className="auth-wordmark">ElectionWatch</Text>
            </View>
            <Text className="auth-title">Register</Text>
            <Text className="auth-subtitle">
              Create an election monitoring account.
            </Text>
          </View>

          <View className="auth-card">
            <View className="auth-form">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <View className="auth-field">
                    <Text className="auth-label">First Name</Text>
                    <TextInput
                      className="auth-input"
                      autoComplete="given-name"
                      onChangeText={setFirstName}
                      placeholder="First name"
                      placeholderTextColor="rgba(0, 0, 0, 0.4)"
                      value={firstName}
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <View className="auth-field">
                    <Text className="auth-label">Last Name</Text>
                    <TextInput
                      className="auth-input"
                      autoComplete="family-name"
                      onChangeText={setLastName}
                      placeholder="Last name"
                      placeholderTextColor="rgba(0, 0, 0, 0.4)"
                      value={lastName}
                    />
                  </View>
                </View>
              </View>

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
              </View>

              <View className="auth-field">
                <Text className="auth-label">Confirm Password</Text>
                <TextInput
                  className="auth-input"
                  autoComplete="password-new"
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  secureTextEntry
                  value={confirmPassword}
                />
              </View>

              <Pressable
                className="flex-row items-start gap-3 py-1"
                onPress={() => setAcceptTerms((current) => !current)}
              >
                <View
                  className={`mt-0.5 size-5 rounded border ${
                    acceptTerms ? "border-accent bg-accent" : "border-border bg-card"
                  }`}
                >
                  {acceptTerms ? (
                    <Text className="text-center text-xs font-sans-bold text-white">
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text className="min-w-0 flex-1 text-sm font-sans-medium text-primary">
                  I accept the Terms and Privacy Policy.
                </Text>
              </Pressable>

              {errorMessage ? <Text className="auth-error">{errorMessage}</Text> : null}

              <Pressable
                className={`auth-button ${!canCreate ? "auth-button-disabled" : ""}`}
                disabled={!canCreate}
                onPress={handleSignUp}
              >
                <Text className="auth-button-text">
                  {isSubmitting ? "Registering..." : "Register"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="auth-link-row">
            <Text className="auth-link-copy">Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="auth-link">Login</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
