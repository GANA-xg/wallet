import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { ReticleDev } from "./reticle-dev";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useDeepLinkHandler() {
  useEffect(() => {
    function handleDeepLink(url: string | null) {
      if (!url) return;
      if (url.includes("bharatwallet://add-ticket") || url.includes("add-ticket")) {
        const queryIndex = url.indexOf("?");
        if (queryIndex === -1) {
          router.push("/add-ticket" as never);
          return;
        }
        const params = new URLSearchParams(url.slice(queryIndex));
        const type = params.get("type") ?? "train";
        const pnr = params.get("pnr") ?? "";
        const source = params.get("source") ?? "";
        router.push(`/add-ticket?type=${type}&pnr=${pnr}&source=${source}` as never);
      } else if (url.includes("bharatwallet://tickets") || url.includes("tickets")) {
        router.push("/tickets" as never);
      }
    }

    Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });
    return () => subscription.remove();
  }, []);
}

function useNotificationHandler() {
  useEffect(() => {
    let Notifications: any = null;
    try {
      Notifications = require("expo-notifications");
    } catch {
      return;
    }

    const setupNotifications = async () => {
      try {
        const { default: NotificationsModule } = Notifications;

        NotificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        const { status } = await NotificationsModule.requestPermissionsAsync();
        if (status !== "granted") return;

        const lastResponse = await NotificationsModule.getLastNotificationResponseAsync();
        if (lastResponse) {
          const ticketId = lastResponse.notification.request.content.data?.ticketId;
          if (ticketId) {
            router.push(`/ticket-detail?id=${ticketId}` as never);
          }
        }

        const subscription = NotificationsModule.addNotificationResponseReceivedListener((response: any) => {
          const ticketId = response.notification.request.content.data?.ticketId;
          if (ticketId) {
            router.push(`/ticket-detail?id=${ticketId}` as never);
          }
        });

        return () => subscription.remove();
      } catch {}
    };

    setupNotifications();
  }, []);
}

function RootLayoutNav() {
  const colors = useColors();
  useDeepLinkHandler();
  useNotificationHandler();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lock" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pay" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="send" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="receive" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="nfc-pay" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="ai-insights" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="security" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="tickets" />
      <Stack.Screen name="add-ticket" />
      <Stack.Screen name="ticket-detail" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="transport" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WalletProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  {(process.env.NODE_ENV === "development" || __DEV__) && <ReticleDev />}
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </WalletProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
