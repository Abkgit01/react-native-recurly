import { formatCurrency } from "@/lib/utils";
import { Image, Text, View } from "react-native";

const UpcomingSubscriptionCard = ({
  icon,
  name,
  price,
  currency,
  daysLeft,
}: UpcomingSubscriptionCardProps) => {
  return (
    <View className="upcoming-card">
      <View className="upcoming-row">
        <Image source={icon} className="upcoming-icon" />
        <View>
          <Text className="upcoming-price">
            {formatCurrency(price, currency)}
          </Text>
          <Text className="upcoming-meta">{daysLeft} days left</Text>
        </View>
      </View>

      <Text className="upcoming-name">{name}</Text>
    </View>
  );
};

export default UpcomingSubscriptionCard;
