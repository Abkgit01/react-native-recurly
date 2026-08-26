import { formatDateTime, formatStatusLabel } from "@/lib/utils";
import { clsx } from "clsx";
import { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export const ScreenContainer = ({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) => (
  <View className={clsx("flex-1 bg-background", padded && "px-5 pt-5")}>
    {children}
  </View>
);

export const AppHeader = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) => (
  <View className="mb-5 flex-row items-start justify-between gap-4">
    <View className="min-w-0 flex-1">
      <Text className="text-3xl font-sans-bold text-primary">{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </View>
    {right}
  </View>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <View className={clsx("rounded-2xl border border-border bg-card p-4", className)}>
    {children}
  </View>
);

export const PrimaryButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    className={clsx("items-center rounded-xl bg-accent px-4 py-4", disabled && "opacity-50")}
    disabled={disabled}
    onPress={onPress}
  >
    <Text className="text-sm font-sans-bold text-white">{label}</Text>
  </Pressable>
);

export const SecondaryButton = ({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    className={clsx(
      "items-center rounded-xl border px-4 py-3",
      danger ? "border-destructive/30 bg-destructive/5" : "border-accent/30 bg-accent/10",
      disabled && "opacity-50",
    )}
    disabled={disabled}
    onPress={onPress}
  >
    <Text className={clsx("text-sm font-sans-bold", danger ? "text-destructive" : "text-accent")}>
      {label}
    </Text>
  </Pressable>
);

const statusClass = (status: string) => {
  if (["verified", "online", "synced", "reported", "clean", "registered", "approved"].includes(status)) {
    return "bg-success/10 text-success";
  }
  if (["pending-upload", "pending", "under-review", "issues", "monitoring", "saved-locally"].includes(status)) {
    return "bg-warning/15 text-warning";
  }
  if (["failed", "server-rejected", "rejected", "open", "duplicate-vin", "low-confidence"].includes(status)) {
    return "bg-destructive/10 text-destructive";
  }
  if (status === "syncing") return "bg-syncing/10 text-syncing";
  return "bg-offline/10 text-offline";
};

export const StatusBadge = ({ status, label }: { status: string; label?: string }) => (
  <View className={clsx("self-start rounded-full px-3 py-1", statusClass(status))}>
    <Text className={clsx("text-xs font-sans-bold", statusClass(status))}>
      {label ?? formatStatusLabel(status)}
    </Text>
  </View>
);

export const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card className="flex-1">
    <Text className="text-2xl font-sans-extrabold text-primary">{value}</Text>
    <Text className="mt-1 text-xs font-sans-semibold text-muted-foreground">{label}</Text>
  </Card>
);

export const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
  <View className="flex-row items-center justify-between gap-4 py-2">
    <Text className="text-sm font-sans-medium text-muted-foreground">{label}</Text>
    <Text className="max-w-[62%] text-right text-sm font-sans-bold text-primary" numberOfLines={2}>
      {value}
    </Text>
  </View>
);

export const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "email-address" | "phone-pad";
  multiline?: boolean;
}) => (
  <View className="gap-2">
    <Text className="text-sm font-sans-semibold text-primary">{label}</Text>
    <TextInput
      className={clsx(
        "rounded-xl border border-border bg-background px-4 py-3 text-base font-sans-medium text-primary",
        multiline && "min-h-24 text-top",
      )}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(0, 0, 0, 0.4)"
      value={value}
    />
  </View>
);

export const SubmissionCard = ({
  submission,
  onRetry,
}: {
  submission: ResultSubmission;
  onRetry?: () => void;
}) => (
  <Card className="gap-3">
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-base font-sans-bold text-primary" numberOfLines={1}>
          {submission.pollingUnit.name}
        </Text>
        <Text className="mt-1 text-xs font-sans-medium text-muted-foreground">
          {submission.localReference} • {formatDateTime(submission.capturedAt)}
        </Text>
      </View>
      <StatusBadge status={submission.syncStatus} />
    </View>
    {submission.syncStatus === "syncing" ? (
      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-syncing" style={{ width: `${submission.syncProgress ?? 35}%` }} />
      </View>
    ) : null}
    {submission.syncStatus === "failed" || submission.syncStatus === "server-rejected" ? (
      <SecondaryButton label="Retry" onPress={onRetry} />
    ) : null}
  </Card>
);
