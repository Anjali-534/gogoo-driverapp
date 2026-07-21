import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { clearSession } from "@/services/session";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchUnread = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("driver_token");
      const res = await axios.get(`${API}/gogoo/support/chat/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tickets = res.data.tickets || [];
      const total = tickets.reduce((acc: number, t: any) => acc + (t.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {}
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("driver_user").then(u => u && setUser(JSON.parse(u)));
    loadProfile();
    fetchUnread();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("driver_token");
      const res = await axios.get(`${API}/gogoo/driver/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch {}
  };

  const logout = () => {
    Alert.alert(t("profile.home.signOutTitle"), t("profile.home.signOutMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.home.signOutTitle"), style: "destructive",
        onPress: async () => {
          await clearSession();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const name = profile?.name || user?.name || t("profile.edit.defaultDriverName");
  const initial = name[0].toUpperCase();
  const rating = profile?.rating != null ? Number(profile.rating).toFixed(1) : "5.0";
  const vehicleType = profile?.vehicle_type || profile?.vehicle?.type || "";
  const vehicleNumber = profile?.vehicle_number || profile?.vehicle?.number || "";

  const quickActions = [
    { label: t("earnings.pageTitle"),     onPress: () => router.push("/(app)/earnings" as any) },
    { label: t("profile.ledger.title"),   onPress: () => router.push("/(app)/profile/ledger" as any) },
    { label: t("profile.payments.title"), onPress: () => router.push("/(app)/profile/payments" as any) },
    { label: t("profile.training.title"), onPress: () => router.push("/(app)/profile/training" as any) },
  ];

  const menuItems = [
    { icon: "gift-outline",          color: COLORS.primary, bg: "#FFF0EC", label: t("profile.refer.title"),      onPress: () => router.push("/(app)/profile/refer" as any) },
    { icon: "notifications-outline", color: COLORS.info, bg: COLORS.infoTint, label: t("notifications.title"),    onPress: () => router.push("/(app)/notifications" as any) },
    { icon: "person-outline",        color: COLORS.success, bg: "#ECFDF5", label: t("profile.edit.title"),      onPress: () => router.push("/(app)/profile/edit" as any) },
    { icon: "language-outline",      color: COLORS.info, bg: COLORS.infoTint, label: t("profile.settings.title"), onPress: () => router.push("/(app)/profile/settings" as any) },
    { icon: "lock-closed-outline",   color: COLORS.purpleAlt, bg: "#F5F3FF", label: t("profile.privacy.title"),   onPress: () => router.push("/(app)/profile/privacy" as any) },
    { icon: "document-text-outline", color: COLORS.warning, bg: COLORS.warningTint, label: t("profile.terms.title"), onPress: () => router.push("/(app)/profile/terms" as any) },
    { icon: "help-circle-outline",   color: COLORS.danger, bg: "#FFF1F2", label: t("profile.help.title"),   onPress: () => router.push("/(app)/profile/help" as any) },
    { icon: "call-outline",          color: COLORS.primary, bg: "#FFF0EC", label: t("profile.contact.title"),       onPress: () => router.push("/(app)/profile/contact" as any) },
  ];

  const handleSupportChat = () => router.push("/(app)/support" as any);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero Card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.avatarWrap}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => router.push("/(app)/profile/edit" as any)}>
              <Ionicons name="pencil-outline" size={13} color={COLORS.white} />
              <Text style={s.editBtnText}>{t("profile.edit.title")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.heroName}>{name}</Text>
          {(vehicleType || vehicleNumber) && (
            <Text style={s.heroVehicle}>{[vehicleType, vehicleNumber].filter(Boolean).join(" • ")}</Text>
          )}
          <View style={s.ratingPill}>
            <Text style={s.ratingText}>⭐ {rating}</Text>
          </View>
        </View>

        {/* Chat with Support */}
        <TouchableOpacity style={s.supportCard} onPress={handleSupportChat} activeOpacity={0.8}>
          <View style={s.supportIconWrap}>
            <Text style={s.supportIcon}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.supportTitle}>{t("profile.home.chatWithSupport")}</Text>
            <Text style={s.supportSub}>{t("profile.home.supportSub")}</Text>
          </View>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadText}>{unreadCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#CCC" />
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <View style={s.gridWrap}>
          <View style={s.grid}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.label} style={s.gridItem} onPress={a.onPress} activeOpacity={0.75}>
                <Text style={s.gridLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu List */}
        <View style={s.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuItem, i < menuItems.length - 1 && s.menuDivider]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={s.logoutText}>{t("profile.home.signOutTitle")}</Text>
        </TouchableOpacity>

        <Text style={s.version}>{t("profile.home.version")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bgAlt },
  scroll:        { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 100 },
  heroCard:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.sheet, padding: 24, marginTop: 8, marginBottom: 20 },
  heroTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  avatarWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF", borderWidth: 3, borderColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  avatarText:    { color: COLORS.primary, fontSize: 32, fontWeight: "900" },
  editBtn:       { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText:   { color: "#FFF", fontSize: 13, fontWeight: "700" },
  heroName:      { color: "#FFF", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  heroVehicle:   { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 10 },
  ratingPill:    { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  ratingText:    { color: "#FFF", fontSize: 14, fontWeight: "700" },
  gridWrap:      { marginBottom: 8 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem:      { width: "47%", backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, minHeight: 80 },
  gridLabel:     { fontSize: 15, fontWeight: "700", color: COLORS.textStrong, textAlign: "center" },
  menuCard:      { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 16, marginTop: 8 },
  menuItem:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  menuDivider:   { borderBottomWidth: 1, borderBottomColor: "#F2F2F2" },
  menuIcon:      { width: 36, height: 36, borderRadius: RADIUS.input, alignItems: "center", justifyContent: "center" },
  menuLabel:     { flex: 1, color: COLORS.textStrong, fontSize: 15, fontWeight: "500" },
  logoutBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFECEC", borderRadius: RADIUS.input, borderWidth: 1, borderColor: "#FEE2E2", paddingVertical: 15, marginBottom: 16 },
  logoutText:    { color: COLORS.danger, fontSize: 15, fontWeight: "700" },
  version:       { color: "#BBB", fontSize: 12, textAlign: "center", marginBottom: 32 },
  supportCard:   { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.infoTint, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: "#BFDBFE", padding: 16, marginBottom: 16, gap: 12 },
  supportIconWrap: { width: 44, height: 44, borderRadius: RADIUS.input, backgroundColor: COLORS.info, alignItems: "center", justifyContent: "center" },
  supportIcon:   { fontSize: 22 },
  supportTitle:  { color: "#1E40AF", fontSize: 15, fontWeight: "800" },
  supportSub:    { color: COLORS.info, fontSize: 12, marginTop: 2 },
  unreadBadge:   { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText:    { color: "#FFF", fontSize: 11, fontWeight: "800" },
});
