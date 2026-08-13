import "@/global.css";
import { icons } from "@/assets/constants/icons";
import { images } from "@/assets/constants/images";
import {
  HOME_BALANCE,
  HOME_SUBSCRIPTIONS,
  HOME_USER,
  UPCOMING_SUBSCRIPTIONS,
} from "@/assets/constants/data";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const router = useRouter();
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        <View className="home-header">
          <View className="home-user">
            <Image source={images.avatar} className="home-avatar" />
            <Text className="home-user-name">{HOME_USER.name}</Text>
          </View>

          <Image source={icons.add} className="home-add-icon" />
        </View>

        <View className="home-balance-card">
          <Text className="home-balance-label">Balance</Text>

          <View className="home-balance-row">
            <Text className="home-balance-amount">
              {formatCurrency(HOME_BALANCE.amount)}
            </Text>
            <Text className="home-balance-date">
              {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
            </Text>
          </View>
        </View>

        <View>
          <ListHeading
            title="Upcoming"
            onPress={() => router.push("/(tabs)/subscriptions")}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {UPCOMING_SUBSCRIPTIONS.map((subscription) => (
              <UpcomingSubscriptionCard
                key={subscription.id}
                icon={subscription.icon}
                name={subscription.name}
                price={subscription.price}
                currency={subscription.currency}
                renewalDate={subscription.renewalDate}
                daysLeft={subscription.daysLeft}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <ListHeading
            title="All Subscription"
            onPress={() => router.push("/(tabs)/subscriptions")}
          />
          <View className="gap-4">
            {HOME_SUBSCRIPTIONS.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                {...subscription}
                expanded={expandedSubscriptionId === subscription.id}
                onPress={() =>
                  setExpandedSubscriptionId((currentId) =>
                    currentId === subscription.id ? null : subscription.id,
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
