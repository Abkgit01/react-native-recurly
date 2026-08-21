import { Link } from "expo-router";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const roles = [
  ["Field Agent", "Capture results and upload from the field"],
  ["Admin / Reviewer", "Review submissions and manage mobile queues"],
  ["Public Results", "Browse and explore election results"],
] as const;

export default function RoleSwitch() {
  return (
    <SafeAreaView className="auth-safe-area">
      <ScrollView className="auth-scroll" contentContainerClassName="auth-content">
        <View className="auth-brand-block">
          <Text className="auth-title">Who are you?</Text>
          <Text className="auth-subtitle">Choose your role to continue.</Text>
        </View>
        <View className="auth-card gap-4">
          {roles.map(([title, subtitle]) => (
            <Link key={title} href="/(tabs)" asChild>
              <Pressable className="rounded-xl border border-border bg-background p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-sans-bold text-primary">{title}</Text>
                    <Text className="mt-1 text-xs font-sans-medium text-muted-foreground">
                      {subtitle}
                    </Text>
                  </View>
                  <Text className="text-2xl font-sans-bold text-accent">›</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
