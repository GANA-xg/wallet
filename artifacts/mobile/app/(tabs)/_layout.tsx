import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Cards</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="upi">
        <Icon sf={{ default: "arrow.up.arrow.down", selected: "arrow.up.arrow.down.circle.fill" }} />
        <Label>UPI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet.rectangle.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.surface,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 64,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={85}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? colors.surface : colors.background }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Feather name="home" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: "Cards",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Feather name="credit-card" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="upi"
        options={{
          title: "UPI",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Feather name="send" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Feather name="list" size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Feather name="grid" size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: "rgba(208,98,36,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
