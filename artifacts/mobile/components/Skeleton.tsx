import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import radius from "@/constants/radius";
import spacing from "@/constants/spacing";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width, height = 16, borderRadius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceElevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonBalance() {
  const colors = useColors();
  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width={80} height={10} borderRadius={4} />
      <Skeleton width={140} height={28} borderRadius={6} style={{ marginTop: spacing.sm }} />
      <View style={styles.balancePills}>
        <Skeleton width={80} height={22} borderRadius={11} />
        <Skeleton width={55} height={22} borderRadius={11} />
      </View>
    </View>
  );
}

export function SkeletonTransaction() {
  const colors = useColors();
  return (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <Skeleton width={36} height={36} borderRadius={radius.md} />
      <View style={styles.txInfo}>
        <Skeleton width={120} height={14} borderRadius={4} />
        <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={60} height={14} borderRadius={4} />
    </View>
  );
}

export function SkeletonCard() {
  const colors = useColors();
  return (
    <View style={[styles.cardSkeleton, { backgroundColor: colors.surfaceElevated }]}>
      <Skeleton width={60} height={10} borderRadius={4} />
      <Skeleton width={36} height={26} borderRadius={5} style={{ marginTop: 16 }} />
      <Skeleton width={140} height={12} borderRadius={4} style={{ marginTop: 12 }} />
      <View style={styles.cardBottom}>
        <Skeleton width={40} height={10} borderRadius={4} />
        <Skeleton width={50} height={10} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: "space-between",
  },
  balancePills: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  cardSkeleton: {
    borderRadius: radius.lg,
    padding: spacing.base,
    width: 200,
    height: 120,
    justifyContent: "space-between",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
