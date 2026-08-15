import { useAuth, useUser } from "@clerk/expo";
import { images } from "@/assets/constants/images";
import { styled } from "nativewind";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "User";
  const email = user?.primaryEmailAddress?.emailAddress;

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Sign-out failed:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="mb-6 text-3xl font-sans-bold text-primary">
        Settings
      </Text>

      <View className="auth-card mb-5">
        <View className="mb-4 flex-row items-center gap-4">
          <Image
            source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
            className="size-16 rounded-full"
          />
          <View className="min-w-0 flex-1">
            <Text
              className="text-lg font-sans-bold text-primary"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {email ? (
              <Text
                className="text-sm font-sans-medium text-muted-foreground"
                numberOfLines={1}
              >
                {email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View className="auth-card mb-5">
        <Text className="mb-3 text-base font-sans-semibold text-primary">
          Account
        </Text>
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-4 py-2">
            <Text className="text-sm font-sans-medium text-muted-foreground">
              Account ID
            </Text>
            <Text
              className="max-w-[60%] text-sm font-sans-medium text-primary"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user?.id}
            </Text>
          </View>
          <View className="flex-row items-center justify-between gap-4 py-2">
            <Text className="text-sm font-sans-medium text-muted-foreground">
              Joined
            </Text>
            <Text className="text-sm font-sans-medium text-primary">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        className={`auth-button bg-destructive ${
          isSigningOut ? "auth-button-disabled" : ""
        }`}
        disabled={isSigningOut}
        onPress={handleSignOut}
      >
        <Text className="auth-button-text text-white">
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};
export default Settings;
