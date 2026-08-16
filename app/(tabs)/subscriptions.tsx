import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const [query, setQuery] = useState("");
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const subscriptions = useSubscriptionStore();

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return subscriptions;

    return subscriptions.filter((subscription) => {
      const searchableText = [
        subscription.name,
        subscription.plan,
        subscription.category,
        subscription.paymentMethod,
        subscription.status,
        subscription.billing,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, subscriptions]);

  return (
    <SafeAreaView className="subscription-screen">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-5 pb-30"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="subscription-title">Subscriptions</Text>
          <Text className="subscription-summary">
            {filteredSubscriptions.length} of {subscriptions.length} plans
          </Text>
        </View>

        <View className="subscription-search">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search subscriptions"
            placeholderTextColor="rgba(0, 0, 0, 0.45)"
            autoCapitalize="none"
            autoCorrect={false}
            className="subscription-search-input"
          />
        </View>

        <View className="gap-4">
          {filteredSubscriptions.map((subscription) => (
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

        {filteredSubscriptions.length === 0 ? (
          <Text className="subscription-empty">
            No subscriptions match your search.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Subscriptions;
