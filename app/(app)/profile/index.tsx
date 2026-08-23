import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, Image, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { clearSession } from "@/services/session";

// Category illustrations already blend a city-skyline backdrop with the
// vehicle render (see assets/illustrations/*.png) — reused as-is rather
// than compositing a separate skyline asset + icon, since no dedicated
// 3-wheeler/etc. asset exists; cab.png (a sedan render) stands in for all
// cab subtypes (2w/3w/4w/suv), same generic-fallback approach the trip-map
// screen's vehicle-icon lookup already uses.
const HERO_ILLUSTRATIONS: Record<string, any> = {
  cab:       require("../../../assets/illustrations/cab.png"),
  truck:     require("../../../assets/illustrations/truck.png"),
  ambulance: require("../../../assets/illustrations/ambulance.png"),
  parcel:    require("../../../assets/illustrations/parcel.png"),
};

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const router = useRouter();

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get(`/gogoo/support/chat/my-tickets`);
      const tickets = res.data.tickets || [];
      const total = tickets.reduce((acc: number, t: any) => acc + (t.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {}
  }, []);

  // Same endpoint/pattern already used for the bell+badge on the Home
  // screen (home/index.tsx) — reused here rather than inventing new data.
  const fetchNotifUnread = useCallback(async () => {
    try {
      const res = await api.get(`/gogoo/driver/notifications/unread-count`);
      setNotifUnreadCount(res.data?.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("driver_user").then(u => u && setUser(JSON.parse(u)));
    loadProfile();
    fetchUnread();
    fetchNotifUnread();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get(`/gogoo/driver/profile`);
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
  const isOnline = !!profile?.is_online;
  const heroCategory = (vehicleType.split("_")[0] || "cab") as keyof typeof HERO_ILLUSTRATIONS;
  const heroIllustration = HERO_ILLUSTRATIONS[heroCategory] || HERO_ILLUSTRATIONS.cab;

  const quickActions = [
    { label: t("earnings.pageTitle"),     icon: "wallet-outline",  color: COLORS.success,   bg: "#ECFDF5",         onPress: () => router.push("/(app)/earnings" as any) },
    { label: t("profile.ledger.title"),   icon: "book-outline",    color: COLORS.purpleAlt, bg: "#F5F3FF",         onPress: () => router.push("/(app)/profile/ledger" as any) },
    { label: t("profile.payments.title"), icon: "card-outline",    color: COLORS.warning,   bg: COLORS.warningTint, onPress: () => router.push("/(app)/profile/payments" as any) },
    { label: t("profile.training.title"), icon: "school-outline",  color: COLORS.info,      bg: COLORS.infoTint,   onPress: () => router.push("/(app)/profile/training" as any) },
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

        {/* Hero — soft orange wash, same gradient tokens Home/Orders use for
            their hero sections this session, just contained/rounded here
            rather than full-bleed since it sits inside the scroll padding */}
        <LinearGradient
          colors={["#FFE8D9", "#FFF6F0", COLORS.bgAlt]}
          locations={[0, 0.6, 1]}
          style={s.heroCard}
        >
          <Image source={heroIllustration} style={s.heroIllustration} resizeMode="cover" />

          <View style={s.heroTop}>
            <View style={s.avatarWrap}>
              <Text style={s.avatarText}>{initial}</Text>
              <View style={[s.onlineDot, { backgroundColor: isOnline ? "#22C55E" : "#9CA3AF" }]} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                style={s.bellBtn}
                onPress={() => { setNotifUnreadCount(0); router.push("/(app)/notifications" as any); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="notifications-outline" size={18} color="#555" />
                {notifUnreadCount > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{notifUnreadCount > 9 ? "9+" : notifUnreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.editBtn} onPress={() => router.push("/(app)/profile/edit" as any)}>
                <Ionicons name="pencil-outline" size={13} color={COLORS.white} />
                <Text style={s.editBtnText}>{t("profile.edit.title")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.heroName}>{name}</Text>
          {(vehicleType || vehicleNumber) && (
            <Text style={s.heroVehicle}>{[vehicleType, vehicleNumber].filter(Boolean).join(" • ")}</Text>
          )}
          <View style={s.ratingPill}>
            <Text style={s.ratingText}>⭐ {rating}</Text>
          </View>
        </LinearGradient>

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
                <View style={[s.gridIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon as any} size={20} color={a.color} />
                </View>
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
  // paddingTop:52 matches the header clearance already used on Home/Orders
  // this session (their logoBar/hero use the same value inside SafeAreaView).
  scroll:        { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 100 },
  // No card: this wraps just the illustration + header content for layout/
  // clipping purposes — no backgroundColor, so it sits on the plain page bg.
  heroCard:      { borderRadius: RADIUS.sheet, overflow: "hidden", padding: 24, marginBottom: 20, position: "relative" },
  heroIllustration: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  heroTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  avatarWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarText:    { color: "#FFF", fontSize: 32, fontWeight: "900" },
  onlineDot:     { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.bgAlt },
  bellBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgFaint, alignItems: "center", justifyContent: "center" },
  bellBadge:     { position: "absolute", top: 1, right: 1, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.bgFaint },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  editBtn:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText:   { color: "#FFF", fontSize: 13, fontWeight: "700" },
  heroName:      { color: COLORS.textStrong, fontSize: 22, fontWeight: "800", marginBottom: 4 },
  heroVehicle:   { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  ratingPill:    { alignSelf: "flex-start", backgroundColor: COLORS.primaryTint, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  ratingText:    { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  gridWrap:      { marginBottom: 8 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem:      { width: "47%", backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 16, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, minHeight: 92, gap: 8 },
  gridIcon:      { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  gridLabel:     { fontSize: 14, fontWeight: "700", color: COLORS.textStrong, textAlign: "center" },
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
