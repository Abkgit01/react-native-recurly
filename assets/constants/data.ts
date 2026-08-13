import { icons } from "./icons";

const getFutureRenewalDate = (monthIndex: number, day: number) => {
  const now = new Date();
  const renewalDate = new Date(
    now.getFullYear(),
    monthIndex,
    day,
    10,
    0,
    0,
    0,
  );

  if (renewalDate <= now) {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  }

  return renewalDate.toISOString();
};

const getDaysLeft = (renewalDate?: string) => {
  if (!renewalDate) return 0;

  const difference = new Date(renewalDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(difference / 86_400_000));
};

export const tabs: AppTab[] = [
  { name: "index", title: "Home", icon: icons.home },
  { name: "subscriptions", title: "Subscriptions", icon: icons.wallet },
  { name: "insights", title: "Insights", icon: icons.activity },
  { name: "settings", title: "Settings", icon: icons.setting },
];

export const HOME_USER = {
  name: "Adrian | JS Mastery",
};

export const HOME_BALANCE = {
  amount: 2489.48,
  nextRenewalDate: "",
};

export const HOME_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "adobe-creative-cloud",
    icon: icons.adobe,
    name: "Adobe Creative Cloud",
    plan: "Teams Plan",
    category: "Design",
    paymentMethod: "Visa ending in 8530",
    status: "active",
    startDate: "2025-03-20T10:00:00.000Z",
    price: 77.49,
    currency: "USD",
    billing: "Monthly",
    renewalDate: getFutureRenewalDate(2, 20),
    color: "#f5c542",
  },
  {
    id: "github-pro",
    icon: icons.github,
    name: "GitHub Pro",
    plan: "Developer",
    category: "Developer Tools",
    paymentMethod: "Mastercard ending in 2408",
    status: "active",
    startDate: "2024-11-24T10:00:00.000Z",
    price: 9.99,
    currency: "USD",
    billing: "Monthly",
    renewalDate: getFutureRenewalDate(2, 24),
    color: "#e8def8",
  },
  {
    id: "claude-pro",
    icon: icons.claude,
    name: "Claude Pro",
    plan: "Pro Plan",
    category: "AI Tools",
    paymentMethod: "Amex ending in 1010",
    status: "paused",
    startDate: "2025-06-27T10:00:00.000Z",
    price: 20.0,
    currency: "USD",
    billing: "Monthly",
    renewalDate: getFutureRenewalDate(2, 27),
    color: "#b8d4e3",
  },
  {
    id: "canva-pro",
    icon: icons.canva,
    name: "Canva Pro",
    plan: "Yearly Access",
    category: "Design",
    paymentMethod: "Visa ending in 7784",
    status: "cancelled",
    startDate: "2024-04-02T10:00:00.000Z",
    price: 119.99,
    currency: "USD",
    billing: "Yearly",
    renewalDate: getFutureRenewalDate(3, 2),
    color: "#b8e8d0",
  },
].map((subscription) => ({
  ...subscription,
  daysLeft: getDaysLeft(subscription.renewalDate),
}));

export const UPCOMING_SUBSCRIPTIONS: UpcomingSubscription[] = HOME_SUBSCRIPTIONS
  .filter((subscription) => {
    if (subscription.status !== "active" || !subscription.renewalDate) {
      return false;
    }

    return new Date(subscription.renewalDate).getTime() > Date.now();
  })
  .sort(
    (first, second) =>
      new Date(first.renewalDate ?? "").getTime() -
      new Date(second.renewalDate ?? "").getTime(),
  )
  .slice(0, 3)
  .map(({ id, icon, name, price, currency, renewalDate }) => ({
    id,
    icon,
    name,
    price,
    currency,
    renewalDate: renewalDate!,
    daysLeft: getDaysLeft(renewalDate),
  }));

HOME_BALANCE.nextRenewalDate =
  UPCOMING_SUBSCRIPTIONS[0]?.renewalDate ?? new Date().toISOString();
