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
        <View className="upcoming-copy">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="upcoming-price"
          >
            {formatCurrency(price, currency)}
          </Text>
          <Text numberOfLines={1} className="upcoming-meta">
            {daysLeft} days left
          </Text>
        </View>
      </View>

      <Text numberOfLines={2} ellipsizeMode="tail" className="upcoming-name">
        {name}
      </Text>
    </View>
  );
};

export default UpcomingSubscriptionCard;
