import { useAuthSession } from "@/lib/authSession";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { getPostAuthRoute, status } = useAuthSession();

  useEffect(() => {
    if (status === "initializing") return;

    router.replace(
      status === "authenticated" ? getPostAuthRoute() : "/(auth)/sign-in",
    );
  }, [getPostAuthRoute, router, status]);

  return (
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
}
