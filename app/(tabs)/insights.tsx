import {
  REPORTING_CURRENCY,
  useSubscriptionStore,
} from "@/lib/subscriptionStore";
import { formatCurrency } from "@/lib/utils";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const getMonthlyCost = (subscription: Subscription, currency: string) => {
  if (subscription.currency !== currency) return 0;

  const price = Number(subscription.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const billing = `${subscription.frequency ?? subscription.billing}`.toLowerCase();

  return billing.includes("year") ? safePrice / 12 : safePrice;
};

const getDaysLeft = (renewalDate?: string) => {
  if (!renewalDate) return Number.POSITIVE_INFINITY;

  const diff = dayjs(renewalDate).diff(dayjs(), "day");
  return Math.max(0, diff);
};

const Insights = () => {
  const subscriptions = useSubscriptionStore();

  const insights = useMemo(() => {
    const currentTime = Date.now();
    const reportingCurrency = REPORTING_CURRENCY;
    const activeSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.status === "active" &&
        subscription.currency === reportingCurrency,
    );
    const monthlySpend = activeSubscriptions.reduce(
      (total, subscription) =>
        total + getMonthlyCost(subscription, reportingCurrency),
      0,
    );
    const annualSpend = monthlySpend * 12;
    const statusCounts = subscriptions.reduce<Record<string, number>>(
      (counts, subscription) => {
        const status = subscription.status ?? "unknown";
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    );
    const categoryTotals = activeSubscriptions.reduce<Record<string, number>>(
      (totals, subscription) => {
        const category = subscription.category?.trim() || "Other";
        totals[category] =
          (totals[category] ?? 0) +
          getMonthlyCost(subscription, reportingCurrency);
        return totals;
      },
      {},
    );
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category,
        total,
        percentage: monthlySpend > 0 ? (total / monthlySpend) * 100 : 0,
      }))
      .sort((first, second) => second.total - first.total);
    const upcomingRenewals = activeSubscriptions
      .filter((subscription) => {
        if (!subscription.renewalDate) return false;

        const renewalTime = dayjs(subscription.renewalDate).valueOf();
        return Number.isFinite(renewalTime) && renewalTime > currentTime;
      })
      .sort(
        (first, second) =>
          dayjs(first.renewalDate).valueOf() - dayjs(second.renewalDate).valueOf(),
      )
      .slice(0, 4);
    const topSubscriptions = [...activeSubscriptions]
      .sort(
        (first, second) =>
          getMonthlyCost(second, reportingCurrency) -
          getMonthlyCost(first, reportingCurrency),
      )
      .slice(0, 3);
    const monthlyCount = activeSubscriptions.filter((subscription) =>
      `${subscription.frequency ?? subscription.billing}`.toLowerCase().includes(
        "month",
      ),
    ).length;
    const yearlyCount = activeSubscriptions.filter((subscription) =>
      `${subscription.frequency ?? subscription.billing}`.toLowerCase().includes(
        "year",
      ),
    ).length;

    return {
      activeCount: activeSubscriptions.length,
      annualSpend,
      categoryBreakdown,
      monthlyCount,
      monthlySpend,
      reportingCurrency,
      statusCounts,
      topSubscriptions,
      upcomingRenewals,
      yearlyCount,
    };
  }, [subscriptions]);

  return (
    <SafeAreaView className="insights-screen">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="insights-title">Insights</Text>
          <Text className="insights-subtitle">
            Track spend, renewal pressure, and subscription mix.
          </Text>
        </View>

        <View className="insights-hero">
          <Text className="insights-hero-label">Monthly spend</Text>
          <Text className="insights-hero-value">
            {formatCurrency(insights.monthlySpend, insights.reportingCurrency)}
          </Text>
          <View className="insights-hero-row">
            <View>
              <Text className="insights-hero-meta">Annualized</Text>
              <Text className="insights-hero-stat">
                {formatCurrency(
                  insights.annualSpend,
                  insights.reportingCurrency,
                )}
              </Text>
            </View>
            <View className="items-end">
              <Text className="insights-hero-meta">Active plans</Text>
              <Text className="insights-hero-stat">{insights.activeCount}</Text>
            </View>
          </View>
        </View>

        <View className="insights-stat-grid">
          {[
            ["Active", insights.statusCounts.active ?? 0],
            ["Paused", insights.statusCounts.paused ?? 0],
            ["Cancelled", insights.statusCounts.cancelled ?? 0],
          ].map(([label, value]) => (
            <View key={label} className="insights-stat-card">
              <Text className="insights-stat-value">{value}</Text>
              <Text className="insights-stat-label">{label}</Text>
            </View>
          ))}
        </View>

        <View className="insights-card">
          <Text className="insights-section-title">Category spend</Text>
          <View className="gap-4">
            {insights.categoryBreakdown.map((item) => (
              <View key={item.category} className="gap-2">
                <View className="insights-row">
                  <Text numberOfLines={1} className="insights-row-title">
                    {item.category}
                  </Text>
                  <Text className="insights-row-value">
                    {formatCurrency(item.total, insights.reportingCurrency)}
                  </Text>
                </View>
                <View className="insights-bar-track">
                  {item.percentage > 0 ? (
                    <View
                      className="insights-bar-fill"
                      style={{ width: `${Math.max(6, item.percentage)}%` }}
                    />
                  ) : null}
                </View>
              </View>
            ))}
            {insights.categoryBreakdown.length === 0 ? (
              <Text className="insights-empty">No active category spend yet.</Text>
            ) : null}
          </View>
        </View>

        <View className="insights-card">
          <Text className="insights-section-title">Billing mix</Text>
          <View className="insights-billing-row">
            <View className="insights-billing-pill">
              <Text className="insights-billing-value">
                {insights.monthlyCount}
              </Text>
              <Text className="insights-billing-label">Monthly</Text>
            </View>
            <View className="insights-billing-pill">
              <Text className="insights-billing-value">{insights.yearlyCount}</Text>
              <Text className="insights-billing-label">Yearly</Text>
            </View>
          </View>
        </View>

        <View className="insights-card">
          <Text className="insights-section-title">Upcoming renewals</Text>
          <View className="gap-3">
            {insights.upcomingRenewals.map((subscription, index) => (
              <View key={subscription.id} className="insights-renewal-row">
                <View className="insights-rank">
                  <Text className="insights-rank-text">{index + 1}</Text>
                </View>
                <Image source={subscription.icon} className="insights-icon" />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="insights-row-title">
                    {subscription.name}
                  </Text>
                  <Text numberOfLines={1} className="insights-row-subtitle">
                    {dayjs(subscription.renewalDate).format("MMM D")} •{" "}
                    {getDaysLeft(subscription.renewalDate)} days left
                  </Text>
                </View>
                <Text className="insights-row-value">
                  {formatCurrency(
                    subscription.price,
                    insights.reportingCurrency,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="insights-card">
          <Text className="insights-section-title">Largest subscriptions</Text>
          <View className="gap-3">
            {insights.topSubscriptions.map((subscription) => (
              <View key={subscription.id} className="insights-renewal-row">
                <Image source={subscription.icon} className="insights-icon" />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="insights-row-title">
                    {subscription.name}
                  </Text>
                  <Text numberOfLines={1} className="insights-row-subtitle">
                    {subscription.category ?? "Other"} • {subscription.billing}
                  </Text>
                </View>
                <Text
                  className={clsx(
                    "insights-row-value",
                    subscription.status !== "active" && "text-muted-foreground",
                  )}
                >
                  {formatCurrency(
                    getMonthlyCost(subscription, insights.reportingCurrency),
                    insights.reportingCurrency,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
