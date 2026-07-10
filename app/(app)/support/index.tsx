import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export default function DriverSupportIndexScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("driver_token");
      const res = await axios.get(`${API}/gogoo/support/chat/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(res.data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const onRefresh = () => { setRefreshing(true); fetchTickets(); };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("support.timeAgo.justNow");
    if (mins < 60) return t("support.timeAgo.minutes", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("support.timeAgo.hours", { count: hrs });
    return t("support.timeAgo.days", { count: Math.floor(hrs / 24) });
  };

  const statusColor = (status: string) => {
    if (status === "open") return COLORS.purple;
    if (status === "in_progress") return COLORS.info;
    if (status === "resolved") return COLORS.success;
    return COLORS.textMuted;
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("support.header")}</Text>
          <Text style={s.subtitle}>{t("support.aiAvailable")}</Text>
        </View>
      </View>

      {/* New Chat Button */}
      <TouchableOpacity style={s.newBtn} onPress={() => router.push("/(app)/support/new" as any)}>
        <Text style={s.newBtnIcon}>+</Text>
        <Text style={s.newBtnText}>{t("support.startNewChat")}</Text>
      </TouchableOpacity>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : tickets.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>{t("support.emptyTitle")}</Text>
            <Text style={s.emptySub}>{t("support.emptySub")}</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>{t("support.recentConversations")}</Text>
            {tickets.map(tk => (
              <TouchableOpacity
                key={tk.id}
                style={s.ticketCard}
                onPress={() => router.push({ pathname: "/(app)/support/chat" as any, params: { ticket_id: tk.id } })}
                activeOpacity={0.75}
              >
                <View style={s.ticketTop}>
                  <Text style={s.ticketNum}>{tk.ticket_number}</Text>
                  <View style={[s.statusBadge, { backgroundColor: statusColor(tk.status) + "20" }]}>
                    <Text style={[s.statusText, { color: statusColor(tk.status) }]}>
                      {tk.status === "resolved" ? t("support.status.resolved")
                        : tk.status === "in_progress" ? t("support.status.inProgress")
                        : tk.status === "open" ? t("support.status.open")
                        : tk.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
                <Text style={s.ticketSubject} numberOfLines={1}>{tk.subject}</Text>
                <View style={s.ticketBottom}>
                  <Text style={s.lastMsg} numberOfLines={1}>
                    {tk.last_message ? `"${tk.last_message.slice(0, 50)}"` : t("support.noMessagesYet")}
                  </Text>
                  <View style={s.ticketMeta}>
                    <Text style={s.timeAgo}>{timeAgo(tk.last_message_at)}</Text>
                    {tk.unread_count > 0 && (
                      <View style={s.unreadBadge}>
                        <Text style={s.unreadText}>{tk.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bgAlt },
  header:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:         { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  title:        { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary, letterSpacing: 0.5 },
  subtitle:     { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  newBtn:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.primary, marginHorizontal: 20, marginBottom: 16, borderRadius: RADIUS.card, paddingVertical: 14, paddingHorizontal: 20 },
  newBtnIcon:   { color: COLORS.white, fontSize: 22, fontWeight: "700", lineHeight: 24 },
  newBtnText:   { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  scroll:       { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },
  ticketCard:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 16, marginBottom: 10 },
  ticketTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  ticketNum:    { fontFamily: "monospace", fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 11, fontWeight: "700" },
  ticketSubject:{ fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 6 },
  ticketBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  lastMsg:      { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontStyle: "italic" },
  ticketMeta:   { flexDirection: "row", alignItems: "center", gap: 6 },
  timeAgo:      { fontSize: 11, color: COLORS.textMuted },
  unreadBadge:  { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText:   { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  emptyWrap:    { alignItems: "center", marginTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyIcon:    { fontSize: 56 },
  emptyTitle:   { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  emptySub:     { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
});
