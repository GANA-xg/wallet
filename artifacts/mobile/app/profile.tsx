import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import * as api from "@/services/api";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, authUser, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const phone = user?.phone || authUser?.phone || "";

  const handlePickImage = async () => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      Alert.alert("Photo Selected", "Profile photo upload via S3 coming soon.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Name cannot be empty");
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateUser({ name: name.trim(), email: email.trim() || undefined });
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setName(user?.name ?? "");
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (p: string) => {
    if (!p) return "Not set";
    if (p.startsWith("+91")) return `+91 ${p.slice(3, 8)} ${p.slice(8)}`;
    return p;
  };

  const INFO_ROWS = [
    { label: "Full Name", value: name, key: "name", editable: true },
    { label: "Phone", value: formatPhone(phone), key: "phone", editable: false, verified: !!phone },
    { label: "Email", value: email || "Not set", key: "email", editable: true },
  ];

  const SETTINGS_LINKS = [
    { icon: "shield" as const, label: "Security", route: "/security", color: "#2E7D32" },
    { icon: "settings" as const, label: "App Settings", route: "/settings", color: "#6366F1" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity
            onPress={editing ? handleSave : () => setEditing(true)}
            disabled={saving}
            hitSlop={12}
          >
            <Feather name={saving ? "loader" : editing ? "check" : "edit-2"} size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Avatar Section */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} disabled={!editing}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
            {editing && (
              <View style={styles.cameraOverlay}>
                <Feather name="camera" size={16} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <Text style={[styles.name, { color: colors.text }]}>{user?.name || "User"}</Text>
        <View style={styles.phoneRow}>
          <Feather name="phone" size={12} color={colors.mutedForeground} />
          <Text style={[styles.phone, { color: colors.mutedForeground }]}>{formatPhone(phone)}</Text>
          {phone && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={10} color={colors.success} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* KYC Status */}
      <Animated.View entering={FadeInDown.duration(500).delay(120)}>
        <View style={[styles.kycCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.success + "30" }]}>
          <View style={[styles.kycIconWrap, { backgroundColor: colors.success + "20" }]}>
            <Feather name="shield" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycTitle, { color: colors.text }]}>KYC Verified</Text>
            <Text style={[styles.kycSub, { color: colors.success }]}>Full KYC completed</Text>
          </View>
          <View style={[styles.kycBadge, { backgroundColor: colors.success + "20" }]}>
            <Text style={[styles.kycBadgeText, { color: colors.success }]}>FULL</Text>
          </View>
        </View>
      </Animated.View>

      {/* Info Card */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT DETAILS</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          {INFO_ROWS.map((item, i) => (
            <View
              key={item.key}
              style={[styles.infoRow, { borderBottomColor: colors.border }, i === INFO_ROWS.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <View style={styles.infoRight}>
                {editing && item.editable ? (
                  <TextInput
                    style={[styles.infoInput, { color: colors.text, borderColor: colors.primary }]}
                    value={item.key === "name" ? name : email}
                    onChangeText={item.key === "name" ? setName : setEmail}
                    selectionColor={colors.primary}
                    placeholder={item.key === "email" ? "Enter email" : "Enter name"}
                    placeholderTextColor={colors.mutedForeground}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
                )}
                {(item as any).verified && (
                  <Feather name="check-circle" size={14} color={colors.success} />
                )}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Quick Links */}
      <Animated.View entering={FadeInDown.duration(500).delay(180)}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          {SETTINGS_LINKS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.linkRow, { borderBottomColor: colors.border }, i === SETTINGS_LINKS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as never);
              }}
            >
              <View style={[styles.linkIcon, { backgroundColor: item.color + "15" }]}>
                <Feather name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.duration(500).delay(220)}>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Log Out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log Out", style: "destructive", onPress: () => {
                logout().then(() => router.replace("/(auth)/onboarding"));
              }},
            ]);
          }}
        >
          <Feather name="log-out" size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  title: { fontSize: 20, fontWeight: "800" },
  avatarSection: { alignItems: "center", gap: 8, marginBottom: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", position: "relative" },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  name: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  phone: { fontSize: 14, fontWeight: "500" },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  kycCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: spacing.base, borderRadius: 14, borderWidth: 1,
    marginBottom: 24,
  },
  kycIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  kycTitle: { fontSize: 14, fontWeight: "700" },
  kycSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  kycBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  kycBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 10 },
  infoCard: { borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  infoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  infoRight: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" },
  infoValue: { fontSize: 15, fontWeight: "600" },
  infoInput: {
    fontSize: 15, fontWeight: "600", textAlign: "right",
    borderBottomWidth: 1, paddingVertical: 2, minWidth: 150,
  },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8,
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});
