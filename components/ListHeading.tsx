import { Text, TouchableOpacity, View } from "react-native";

const ListHeading = ({ onPress, title }: ListHeadingProps) => {
  return (
    <View className="list-head">
      <Text className="list-title">{title}</Text>

      {onPress ? (
        <TouchableOpacity className="list-action" onPress={onPress}>
          <Text className="list-action-text">View all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default ListHeading;
