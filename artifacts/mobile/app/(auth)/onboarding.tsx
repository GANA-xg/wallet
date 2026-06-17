import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: 1,
    icon: "layers" as const,
    title: "Your Wallet,\nReinvented",
    subtitle: "One premium wallet for all your cards, UPI, and money — designed with intention.",
    gradient: ["#FF6B00", "#FF4500"] as [string, string],
  },
  {
    id: 2,
    icon: "zap" as const,
    title: "Pay Instantly,\nAnywhere",
    subtitle: "Send money, scan QR, pay bills — all in seconds. No friction, just flow.",
    gradient: ["#7C3AED", "#4F46E5"] as [string, string],
  },
  {
    id: 3,
    icon: "bar-chart-2" as const,
    title: "Smart Money\nInsights",
    subtitle: "AI-powered analysis of your spending, budgets, and subscriptions — beautifully clear.",
    gradient: ["#059669", "#0D9488"] as [string, string],
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnimations = SLIDES.map(() => useRef(new Animated.Value(0)).current);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push("/(auth)/login");
    }
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
            <LinearGradient
              colors={slide.gradient}
              style={styles.iconContainer}
            >
              <Feather name={slide.icon} size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={["#FF6B00", "#FF9240"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>
              {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1115" },
  scroll: { flex: 1 },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0B7C3",
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#262B36",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#FF6B00",
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
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  skip: {
    alignItems: "center",
    paddingVertical: 4,
  },
  skipText: {
    color: "#B0B7C3",
    fontSize: 15,
  },
});
