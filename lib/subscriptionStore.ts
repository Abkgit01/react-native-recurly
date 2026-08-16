import { HOME_SUBSCRIPTIONS } from "@/assets/constants/data";
import { icons } from "@/assets/constants/icons";
import { useSyncExternalStore } from "react";

type Listener = () => void;

let subscriptions = HOME_SUBSCRIPTIONS;
const listeners = new Set<Listener>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => subscriptions;

export const useSubscriptionStore = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const addSubscription = (subscription: Subscription) => {
  subscriptions = [subscription, ...subscriptions];
  emitChange();
};

export const setSubscriptions = (nextSubscriptions: Subscription[]) => {
  subscriptions = nextSubscriptions;
  emitChange();
};

export const getSubscriptionIcon = (name: string, category?: string) => {
  const normalizedName = name.toLowerCase();
  const normalizedCategory = category?.toLowerCase() ?? "";

  if (normalizedName.includes("netflix")) return icons.netflix;
  if (normalizedName.includes("spotify")) return icons.spotify;
  if (normalizedName.includes("notion")) return icons.notion;
  if (normalizedName.includes("figma")) return icons.figma;
  if (normalizedName.includes("github")) return icons.github;
  if (normalizedName.includes("adobe")) return icons.adobe;
  if (normalizedName.includes("canva")) return icons.canva;
  if (normalizedName.includes("claude")) return icons.claude;
  if (normalizedName.includes("openai") || normalizedName.includes("chatgpt")) {
    return icons.openai;
  }
  if (normalizedName.includes("dropbox")) return icons.dropbox;
  if (normalizedName.includes("medium")) return icons.medium;

  if (normalizedCategory.includes("music")) return icons.spotify;
  if (normalizedCategory.includes("developer")) return icons.github;
  if (normalizedCategory.includes("design")) return icons.figma;
  if (normalizedCategory.includes("ai")) return icons.openai;
  if (normalizedCategory.includes("productivity")) return icons.notion;

  return icons.plus;
};
