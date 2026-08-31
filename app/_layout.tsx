import "@/global.css";
import { AuthSessionProvider, useAuthSession } from "@/lib/authSession";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";

const postHogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const postHogHost =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

SplashScreen.preventAutoHideAsync();

const PostHogAppEvents = ({ children }: { children: ReactNode }) => {
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture("app_opened");
  }, [posthog]);

  return children;
};

const StartupScreen = () => (
  <View className="flex-1 items-center justify-center bg-primary px-8">
    <View className="size-24 items-center justify-center rounded-3xl border border-gold/60 bg-white/10">
      <Text className="text-5xl font-sans-extrabold text-white">OK</Text>
    </View>
    <Text className="mt-6 text-center text-4xl font-sans-extrabold text-white">
      ElectionWatch
    </Text>
    <Text className="mt-2 text-center text-base font-sans-semibold text-white/75">
      Restoring session...
    </Text>
  </View>
);

const RootNavigator = () => {
  const { isSignedIn, status } = useAuthSession();
  const isInitializing = status === "initializing";

  if (isInitializing) return <StartupScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="public-results" />
      <Stack.Screen name="(auth)" />
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="kyc-submission" />
        <Stack.Screen name="incident-report" />
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("../assets/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (fontError) {
    console.error("Failed to load app fonts", fontError);
  }

  const content = (() => {
    if (fontError) {
      return (
        <View className="flex-1 items-center justify-center bg-background p-5">
          <Text className="text-center text-base font-sans-bold text-primary">
            Unable to load app fonts.
          </Text>
        </View>
      );
    }

    if (!fontsLoaded) return null;

    return <RootNavigator />;
  })();

  const appContent = postHogApiKey ? (
    <PostHogProvider
      apiKey={postHogApiKey}
      options={{ host: postHogHost, captureAppLifecycleEvents: false }}
      autocapture={{ captureScreens: false }}
    >
      <PostHogAppEvents>{content}</PostHogAppEvents>
    </PostHogProvider>
  ) : (
    content
  );

  return <AuthSessionProvider>{appContent}</AuthSessionProvider>;
}
