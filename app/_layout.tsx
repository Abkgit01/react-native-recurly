import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import "@/global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
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

  if (!publishableKey) {
    if (__DEV__) {
      console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.");
    }

    return (
      <View className="flex-1 items-center justify-center bg-background p-5">
        <Text className="text-center text-base font-sans-bold text-primary">
          Missing Clerk publishable key. Add it to .env, then restart the dev
          server.
        </Text>
      </View>
    );
  }

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

    return <Stack screenOptions={{ headerShown: false }} />;
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

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {appContent}
    </ClerkProvider>
  );
}
