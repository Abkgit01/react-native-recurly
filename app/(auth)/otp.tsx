import { Link } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function OTPVerification() {
  const [code, setCode] = useState("");

  return (
    <SafeAreaView className="auth-safe-area">
      <ScrollView className="auth-scroll" contentContainerClassName="auth-content">
        <View className="auth-brand-block">
          <View className="auth-logo-mark">
            <Text className="auth-logo-mark-text">✓</Text>
          </View>
          <Text className="auth-title mt-8">Verify your phone</Text>
          <Text className="auth-subtitle">
            Enter the six-digit code sent to 08133811722.
          </Text>
        </View>

        <View className="auth-card">
          <View className="auth-form">
            <TextInput
              className="auth-input text-center text-2xl"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setCode}
              placeholder="000000"
              value={code}
            />
            <Text className="text-center text-sm font-sans-medium text-accent">
              Resend code in 00:28
            </Text>
            <Link href="./role-switch" asChild>
              <Pressable className={`auth-button ${code.length < 6 ? "auth-button-disabled" : ""}`} disabled={code.length < 6}>
                <Text className="auth-button-text">Verify OTP</Text>
              </Pressable>
            </Link>
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
