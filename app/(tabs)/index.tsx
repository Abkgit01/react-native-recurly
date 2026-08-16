import { useAuth, useUser } from "@clerk/expo";
import "@/global.css";
import { images } from "@/assets/constants/images";
import { HOME_BALANCE, HOME_USER } from "@/assets/constants/data";
import { icons } from "@/assets/constants/icons";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { addSubscription, useSubscriptionStore } from "@/lib/subscriptionStore";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const [signOutError, setSignOutError] = useState("");
  const subscriptions = useSubscriptionStore();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    HOME_USER.name;

  const upcomingSubscriptions = useMemo(
    () =>
      subscriptions
        .filter(
          (subscription) =>
            subscription.status === "active" &&
            subscription.renewalDate &&
            new Date(subscription.renewalDate).getTime() > Date.now(),
        )
        .sort(
          (first, second) =>
            new Date(first.renewalDate ?? "").getTime() -
            new Date(second.renewalDate ?? "").getTime(),
        )
        .slice(0, 5),
    [subscriptions],
  );
  const nextRenewalDate =
    upcomingSubscriptions[0]?.renewalDate ?? HOME_BALANCE.nextRenewalDate;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={subscriptions}
        keyExtractor={(subscription) => subscription.id}
        className="flex-1"
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="home-header">
              <View className="home-user">
                <Image
                  source={
                    user?.imageUrl ? { uri: user.imageUrl } : images.avatar
                  }
                  className="home-avatar"
                />
                <Text numberOfLines={1} className="home-user-name">
                  {displayName}
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={async () => {
                    setSignOutError("");

                    try {
                      await signOut();
                    } catch (error) {
                      console.error("Sign-out failed:", error);
                      setSignOutError("Unable to sign out. Please try again.");
                    }
                  }}
                >
                  <Text className="auth-link">Sign out</Text>
                </Pressable>

                <Pressable onPress={() => setIsCreateModalVisible(true)}>
                  <Image source={icons.add} className="home-add-icon" />
                </Pressable>
              </View>
            </View>
            {signOutError ? (
              <Text className="auth-error">{signOutError}</Text>
            ) : null}

            <View className="home-balance-card">
              <Text className="home-balance-label">Balance</Text>

              <View className="home-balance-row">
                <Text className="home-balance-amount">
                  {formatCurrency(HOME_BALANCE.amount)}
                </Text>
                <Text className="home-balance-date">
                  {dayjs(nextRenewalDate).format("MM/DD")}
                </Text>
              </View>
            </View>

            <View>
              <ListHeading
                title="Upcoming"
                onPress={() => router.push("/(tabs)/subscriptions")}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {upcomingSubscriptions.map((subscription) => (
                  <UpcomingSubscriptionCard
                    key={subscription.id}
                    icon={subscription.icon}
                    name={subscription.name}
                    price={subscription.price}
                    currency={subscription.currency}
                    renewalDate={subscription.renewalDate!}
                    daysLeft={subscription.daysLeft ?? 0}
                  />
                ))}
              </ScrollView>
            </View>

            <ListHeading
              title="All Subscription"
              onPress={() => router.push("/(tabs)/subscriptions")}
            />
          </>
        }
        renderItem={({ item: subscription }) => (
          <SubscriptionCard
            {...subscription}
            expanded={expandedSubscriptionId === subscription.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === subscription.id ? null : subscription.id,
              )
            }
          />
        )}
        ListEmptyComponent={
          <Text className="home-empty-state">No subscriptions yet.</Text>
        }
      />

      <CreateSubscriptionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={(subscription) => {
          addSubscription(subscription);
          setExpandedSubscriptionId(subscription.id);
        }}
      />
    </SafeAreaView>
  );
}
