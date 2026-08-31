import { tabs } from "@/assets/constants/data";
import { colors, components } from "@/assets/constants/theme";
import { useAuthSession } from "@/lib/authSession";
import { clsx } from "clsx";
import { Redirect, Tabs } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

const TabLayout = () => {
  const { dashboard, isLoaded, isSignedIn } = useAuthSession();
  const insets = useSafeAreaInsets();
  const canOpenCapture = Boolean(dashboard?.kycApproved);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  const TabIcon = ({ focused, icon, name }: TabIconProps) => {
    const isCaptureTab = name === "capture";

    return (
      <View className="tabs-icon">
        <View className={clsx("tabs-pill", focused && "tabs-active")}>
          <Image
            source={icon}
            resizeMode="contain"
            className="tabs-glyph"
            style={isCaptureTab ? { tintColor: "#ffffff" } : undefined}
          />
        </View>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.66)",
        tabBarLabelStyle: {
          fontFamily: "sans-semibold",
          fontSize: 10,
          marginTop: -6,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, tabBar.horizontalInset),
          height: tabBar.height + 8,
          marginHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6,
        },
        tabBarIconStyle: {
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          alignItems: "center",
        },
      }}
    >
      {tabs.map((tab) => {
        const screen = (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ focused }) => (
                <TabIcon focused={focused} icon={tab.icon} name={tab.name} />
              ),
            }}
          />
        );

        if (tab.name !== "capture") return screen;

        return (
          <Tabs.Protected key={tab.name} guard={canOpenCapture}>
            {screen}
          </Tabs.Protected>
        );
      })}
    </Tabs>
  );
};

export default TabLayout;
