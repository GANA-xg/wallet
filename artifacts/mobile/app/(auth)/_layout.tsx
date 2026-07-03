import { Stack } from "expo-router";
import React from "react";

const screenStyle = { backgroundColor: "#151515" };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: screenStyle }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
