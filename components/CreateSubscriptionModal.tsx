import { getSubscriptionIcon } from "@/lib/subscriptionStore";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const CATEGORY_OPTIONS = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
] as const;

const CATEGORY_COLORS: Record<(typeof CATEGORY_OPTIONS)[number], string> = {
  Entertainment: "#f7b267",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#b8e8d0",
  Cloud: "#a7d8f0",
  Music: "#f3b7c8",
  Other: "#ddd6c7",
};

type Frequency = "Monthly" | "Yearly";
type Category = (typeof CATEGORY_OPTIONS)[number];

interface CreateSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
}

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] = useState<Category>("Entertainment");
  const [error, setError] = useState("");

  const parsedPrice = Number(price);
  const canSubmit = name.trim().length > 0 && parsedPrice > 0;

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Entertainment");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a subscription name.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Enter a valid positive price.");
      return;
    }

    const startDate = dayjs();
    const renewalDate = startDate.add(
      1,
      frequency === "Monthly" ? "month" : "year",
    );
    const normalizedName = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    onCreate({
      id: `${normalizedName || "subscription"}-${Date.now()}`,
      icon: getSubscriptionIcon(trimmedName, category),
      name: trimmedName,
      plan: frequency,
      category,
      paymentMethod: "Not provided",
      status: "active",
      startDate: startDate.toISOString(),
      price: parsedPrice,
      currency: "USD",
      billing: frequency,
      frequency,
      renewalDate: renewalDate.toISOString(),
      color: CATEGORY_COLORS[category],
      daysLeft: renewalDate.diff(startDate, "day"),
    });

    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <Pressable className="modal-overlay" onPress={Keyboard.dismiss}>
          <Pressable
            className="modal-container"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="modal-header">
              <Text className="modal-title">New Subscription</Text>
              <Pressable className="modal-close" onPress={handleClose}>
                <Text className="modal-close-text">x</Text>
              </Pressable>
            </View>

            <ScrollView
              className="p-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable className="gap-5 pb-5" onPress={Keyboard.dismiss}>
                <View className="auth-field">
                  <Text className="auth-label">Name</Text>
                  <TextInput
                    value={name}
                    onPressIn={(event) => event.stopPropagation()}
                    onChangeText={(value) => {
                      setName(value);
                      setError("");
                    }}
                    placeholder="Netflix"
                    placeholderTextColor="rgba(0, 0, 0, 0.45)"
                    className="auth-input"
                  />
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Price</Text>
                  <TextInput
                    value={price}
                    onPressIn={(event) => event.stopPropagation()}
                    onChangeText={(value) => {
                      setPrice(value);
                      setError("");
                    }}
                    placeholder="12.99"
                    placeholderTextColor="rgba(0, 0, 0, 0.45)"
                    keyboardType="decimal-pad"
                    className="auth-input"
                  />
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Frequency</Text>
                  <View className="picker-row">
                    {(["Monthly", "Yearly"] as const).map((option) => {
                      const isActive = frequency === option;

                      return (
                        <Pressable
                          key={option}
                          className={clsx(
                            "picker-option",
                            isActive && "picker-option-active",
                          )}
                          onPress={(event) => {
                            event.stopPropagation();
                            setFrequency(option);
                          }}
                        >
                          <Text
                            className={clsx(
                              "picker-option-text",
                              isActive && "picker-option-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Category</Text>
                  <View className="category-scroll">
                    {CATEGORY_OPTIONS.map((option) => {
                      const isActive = category === option;

                      return (
                        <Pressable
                          key={option}
                          className={clsx(
                            "category-chip",
                            isActive && "category-chip-active",
                          )}
                          onPress={(event) => {
                            event.stopPropagation();
                            setCategory(option);
                          }}
                        >
                          <Text
                            className={clsx(
                              "category-chip-text",
                              isActive && "category-chip-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {error ? <Text className="auth-error">{error}</Text> : null}

                <Pressable
                  className={clsx(
                    "auth-button",
                    !canSubmit && "auth-button-disabled",
                  )}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleSubmit();
                  }}
                >
                  <Text className="auth-button-text">Create Subscription</Text>
                </Pressable>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateSubscriptionModal;
