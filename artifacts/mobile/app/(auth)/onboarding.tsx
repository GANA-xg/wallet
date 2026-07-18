import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: 1,
    icon: "layers" as const,
    title: "Your Wallet,\nReinvented",
    subtitle: "One premium wallet for all your cards, UPI, and money — designed with intention.",
    gradient: ["#D06224", "#AE431E"] as [string, string],
    decorativeColor: "rgba(208, 98, 36, 0.15)",
  },
  {
    id: 2,
    icon: "zap" as const,
    title: "Pay Instantly,\nAnywhere",
    subtitle: "Send money, scan QR, pay bills — all in seconds. No friction, just flow.",
    gradient: ["#2E7D32", "#1B5E20"] as [string, string],
    decorativeColor: "rgba(46, 125, 50, 0.15)",
  },
  {
    id: 3,
    icon: "bar-chart-2" as const,
    title: "Smart Money\nInsights",
    subtitle: "AI-powered analysis of your spending, budgets, and subscriptions — beautifully clear.",
    gradient: ["#EAC891", "#D4B07A"] as [string, string],
    decorativeColor: "rgba(234, 200, 145, 0.15)",
  },
];

function Dot({ index, currentIndex }: { index: number; currentIndex: number }) {
  const widthAnim = useAnimatedStyle(() => ({
    width: withSpring(index === currentIndex ? 32 : 8, {
      damping: 15,
      stiffness: 200,
    }),
    backgroundColor: withTiming(
      index === currentIndex ? "#D06224" : "#2A2520",
      { duration: 300 },
    ),
  }));

  return <Animated.View style={[styles.dot, widthAnim]} />;
}

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push("/(auth)/login");
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/(auth)/login");
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            {/* Decorative background circle */}
            <View
              style={[
                styles.decorativeCircle,
                { backgroundColor: slide.decorativeColor },
              ]}
            />

            <Animated.View entering={FadeInDown.duration(600).springify().damping(28)}>
              <LinearGradient
                colors={slide.gradient}
                style={styles.iconContainer}
              >
                <Feather name={slide.icon} size={44} color="#FFFDF9" />
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(150).springify().damping(28)}>
              <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(250).springify().damping(28)}>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{slide.subtitle}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} currentIndex={currentIndex} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={["#D06224", "#AE431E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>
              {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
            </Text>
            <Feather name="arrow-right" size={18} color="#FFFDF9" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skip}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0D0A" },
  scroll: { flex: 1 },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 24,
  },
  decorativeCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: "20%",
    opacity: 0.5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  btnGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "#FFFDF9",
    fontSize: 17,
    fontWeight: "700",
  },
  skip: {
    alignItems: "center",
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 15,
  },
});
