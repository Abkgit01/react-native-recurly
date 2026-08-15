import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import "@/global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, View } from "react-native";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env, then restart the dev server.",
  );
}

SplashScreen.preventAutoHideAsync();

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

    return (
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <View className="flex-1 items-center justify-center bg-background p-5">
          <Text className="text-center text-base font-sans-bold text-primary">
            Unable to load app fonts.
          </Text>
        </View>
      </ClerkProvider>
    );
  }

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );
}
