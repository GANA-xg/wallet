import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#FF6B00" size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0F1115",
    justifyContent: "center",
    alignItems: "center",
  },
});
