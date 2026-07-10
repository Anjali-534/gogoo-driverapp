import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = await AsyncStorage.getItem("driver_token");
      const res = await axios.get(`${API}/gogoo/driver/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data?.bookings || res.data || []);
    } catch { setBookings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const completed = [...bookings.filter(b => b.status === "completed")].reverse();

  const renderItem = ({ item }: { item: any }) => {
    const fare         = item.fare || 0;
    const driverEarned = Math.round(fare * 0.80);
    const drop         = item.drop_address || t("profile.payments.unknownDestination");
    const dropShort    = drop.length > 32 ? drop.slice(0, 32) + "…" : drop;
    const crn          = String(item.id || "").slice(-8).toUpperCase();

    return (
      <View style={s.card}>
        <View style={s.iconWrap}>
          <Ionicons name="car-outline" size={18} color={COLORS.primary} />
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{t("profile.payments.tripEarnings")}</Text>
          <Text style={s.cardDate}>{fmtDate(item.completed_at || item.created_at)}</Text>
          <Text style={s.cardDesc}>{t("profile.payments.crnDesc", { crn, drop: dropShort })}</Text>
          <View style={s.statusRow}>
            <Text style={s.statusDot}>●</Text>
            <Text style={s.statusText}>{t("profile.payments.success")}</Text>
          </View>
        </View>
        <Text style={s.cardAmount}>+₹{driverEarned}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.payments.title")}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={completed}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={completed.length === 0 ? s.emptyContainer : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />}
          ListFooterComponent={completed.length > 0 ? <Text style={s.footer}>{t("profile.payments.noMoreItems")}</Text> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="wallet-outline" size={52} color="#DDD" />
              <Text style={s.emptyTitle}>{t("profile.payments.noPaymentsYet")}</Text>
              <Text style={s.emptySub}>{t("profile.payments.noPaymentsSub")}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bgAlt },
  header:        { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:          { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerTitle:   { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  list:          { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  emptyContainer:{ flex: 1, paddingHorizontal: 20 },
  card:          { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 16, marginBottom: 10, gap: 12 },
  iconWrap:      { width: 40, height: 40, borderRadius: RADIUS.input, backgroundColor: "#FFF0EC", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardBody:      { flex: 1 },
  cardTitle:     { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 3 },
  cardDate:      { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  cardDesc:      { color: "#6B7280", fontSize: 12, marginBottom: 6 },
  statusRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot:     { color: COLORS.success, fontSize: 10 },
  statusText:    { color: COLORS.success, fontSize: 12, fontWeight: "700" },
  cardAmount:    { fontSize: 15, fontWeight: "800", color: COLORS.success, flexShrink: 0 },
  footer:        { textAlign: "center", color: COLORS.textMuted, fontSize: 12, paddingVertical: 20 },
  empty:         { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle:    { color: "#333", fontSize: 16, fontWeight: "700" },
  emptySub:      { color: "#AAA", fontSize: 13, textAlign: "center" },
});
