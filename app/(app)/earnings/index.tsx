import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";
import { trackEarningsViewed } from "@/services/analytics";
import { COLORS, RADIUS } from "@/constants/theme";
import EarningsRangeFilter, { EarningsRange } from "@/components/EarningsRangeFilter";
import { useTranslation } from "react-i18next";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function EarningsScreen() {
  const { t } = useTranslation();
  const DAY_NAMES = DAY_KEYS.map(k => t(`earnings.days.${k}`));
  const [bookings, setBookings] = useState<any[]>([]);
  const [summary,  setSummary]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const weekDays = getWeekDays();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [range, setRange] = useState<EarningsRange>("this_week");
  const [rangeSummary, setRangeSummary] = useState<any>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const changeRange = async (r: EarningsRange) => {
    setRange(r);
    setRangeLoading(true);
    try {
      const res = await api.get(`/gogoo/driver/ledger`, { params: { range: r } });
      setRangeSummary(res.data || null);
    } catch { /* keep showing previous range on failure */ }
    finally { setRangeLoading(false); }
  };

  useEffect(() => { changeRange("this_week"); }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [bookRes, sumRes] = await Promise.allSettled([
        api.get(`/gogoo/driver/bookings`),
        api.get(`/gogoo/driver/earnings/summary`),
      ]);
      if (bookRes.status === "fulfilled") {
        setBookings(bookRes.value.data?.bookings || bookRes.value.data || []);
      }
      if (sumRes.status === "fulfilled") {
        const s = sumRes.value.data;
        setSummary(s);
        trackEarningsViewed({
          totalEarnings: Math.round(s?.total?.earnings || 0),
          walletBalance: Math.round(s?.wallet_balance || 0),
          totalRides: s?.total?.trips || 0,
        });
      }
    } catch { setBookings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const completed = bookings.filter(b => b.status === "completed");
  const today = new Date();

  const weekStart = weekDays[0];
  const weekEnd = new Date(weekDays[6].getTime() + 86399999);
  const weekTrips = completed.filter(b => {
    const d = new Date(b.completed_at || b.created_at);
    return d >= weekStart && d <= weekEnd;
  });
  // Use summary API data if available, else fall back to local calculation
  const weekEarnings = summary?.week?.earnings
    ? Math.round(summary.week.earnings)
    : Math.round(weekTrips.reduce((s, b) => s + (b.fare || 0) * 0.80, 0));
  const weekTripCount = summary?.week?.trips ?? weekTrips.length;
  const weekMinutes = weekTrips.reduce((s, b) => s + (b.duration_minutes || 0), 0);

  const dayTrips = completed.filter(b => isSameDay(new Date(b.completed_at || b.created_at), selectedDay));
  const dayEarnings = Math.round(dayTrips.reduce((s, b) => s + (b.fare || 0) * 0.80, 0));
  const dayMinutes = dayTrips.reduce((s, b) => s + (b.duration_minutes || 0), 0);

  const fetchBookings = fetchData; // alias used by existing refresh handler

  const dayLabel = isSameDay(selectedDay, today)
    ? t("earnings.todaySummary")
    : selectedDay.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }).toUpperCase();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />}
      >
        {/* Hero — full-bleed gradient, same technique as home/orders */}
        <LinearGradient
          colors={["#FFE8D9", "#FFF6F0", COLORS.bg]}
          locations={[0, 0.6, 1]}
          style={s.hero}
        >
          <View style={s.logoBar}>
            <Image source={require("../../../assets/logo.png")} style={s.logo} resizeMode="contain" />
          </View>
          <Image
            source={require("../../../assets/illustrations/hero-truck.png")}
            style={s.heroTruckImg}
            resizeMode="contain"
          />
          <View style={s.heroTextCol}>
            <Text style={s.pageTitle}>{t("earnings.pageTitle")}</Text>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={s.loadingWrap}><ActivityIndicator color={COLORS.primary} size="large" /></View>
        ) : (
          <>
            {/* Date range filter — a separate, driver-selectable summary from
                the fixed "this week" card + day drill-down below, which keep
                working exactly as before regardless of this selection. */}
            <View style={s.rangeCard}>
              <Text style={s.sectionLabel}>{t("earnings.filterByPeriod")}</Text>
              <EarningsRangeFilter selected={range} onSelect={changeRange} rangeLabel={rangeSummary?.range_label} />

              {rangeLoading ? (
                <View style={{ paddingVertical: 16 }}><ActivityIndicator color={COLORS.primary} /></View>
              ) : rangeSummary && (
                <View style={s.cardRow}>
                  <Image source={require("../../../assets/illustrations/wallet.png")} style={s.cardIllustration} resizeMode="contain" />
                  <View style={[s.rangeStatsRow, { flex: 1 }]}>
                    <View style={s.rangeStatItem}>
                      <Text style={[s.rangeStatValue, { color: COLORS.success }]}>₹{Math.round(rangeSummary.total_earned ?? 0)}</Text>
                      <Text style={s.rangeStatLabel}>{t("earnings.earned")}</Text>
                      <View style={[s.statBadge, { backgroundColor: COLORS.successTint }]}>
                        <Ionicons name="arrow-up-outline" size={14} color={COLORS.success} />
                      </View>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.rangeStatItem}>
                      <Text style={[s.rangeStatValue, { color: COLORS.danger }]}>₹{Math.round(rangeSummary.total_debited ?? 0)}</Text>
                      <Text style={s.rangeStatLabel}>{t("earnings.debited")}</Text>
                      <View style={[s.statBadge, { backgroundColor: COLORS.dangerTint }]}>
                        <Ionicons name="arrow-down-outline" size={14} color={COLORS.danger} />
                      </View>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.rangeStatItem}>
                      <Text style={[s.rangeStatValue, { color: (rangeSummary.net ?? 0) >= 0 ? COLORS.success : COLORS.danger }]}>
                        {(rangeSummary.net ?? 0) >= 0 ? "+" : ""}₹{Math.round(rangeSummary.net ?? 0)}
                      </Text>
                      <Text style={s.rangeStatLabel}>{t("earnings.net")}</Text>
                      <View style={[s.statBadge, { backgroundColor: COLORS.primaryTint }]}>
                        <Ionicons name="wallet-outline" size={14} color={COLORS.primary} />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Lifetime Earnings — all-time total from summary.total, not
                scoped to any date range like the week/day cards below.
                Only rendered once summary.total is actually present (the
                surrounding loading gate already prevents a ₹0 flash; this
                guard additionally covers the summary-fetch-failed case,
                same idiom as rangeCard's `rangeSummary &&` above). */}
            {summary?.total && (
              <View style={s.weekCard}>
                <Text style={s.weekLabel}>{t("earnings.lifetimeEarnings")}</Text>

                <View style={s.cardRow}>
                  <Image source={require("../../../assets/illustrations/money.png")} style={s.cardIllustration} resizeMode="contain" />
                  <View style={[s.statsRow, { flex: 1 }]}>
                    <View style={s.statItem}>
                      <Text style={s.statValue}>₹{Math.round(summary.total.earnings || 0)}</Text>
                      <Text style={s.statLabel}>{t("earnings.earningsLabel")}</Text>
                      <View style={[s.statBadge, { backgroundColor: COLORS.successTint }]}>
                        <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                      </View>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                      <Text style={s.statValue}>{summary.total.trips || 0}</Text>
                      <Text style={s.statLabel}>{t("earnings.tripsTaken")}</Text>
                      <View style={[s.statBadge, { backgroundColor: COLORS.primaryTint }]}>
                        <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Weekly Summary */}
            <View style={s.weekCard}>
              <Text style={s.weekLabel}>{t("earnings.thisWeek")}</Text>

              <View style={s.cardRow}>
                <Image source={require("../../../assets/illustrations/task.png")} style={s.cardIllustration} resizeMode="contain" />
                <View style={[s.statsRow, { flex: 1 }]}>
                  <View style={s.statItem}>
                    <Text style={s.statValue}>₹{weekEarnings}</Text>
                    <Text style={s.statLabel}>{t("earnings.earningsLabel")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.successTint }]}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                    </View>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m</Text>
                    <Text style={s.statLabel}>{t("earnings.timeSpent")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.infoTint }]}>
                      <Ionicons name="time-outline" size={14} color={COLORS.info} />
                    </View>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{weekTripCount}</Text>
                    <Text style={s.statLabel}>{t("earnings.tripsTaken")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.primaryTint }]}>
                      <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Day Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.daySelectorWrap}
            >
              {weekDays.map((day, i) => {
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, today);
                return (
                  <TouchableOpacity
                    key={i}
                    style={s.dayCol}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dayName, isSelected && s.dayNameActive]}>{DAY_NAMES[i]}</Text>
                    <View style={[s.dayCircle, isSelected && s.dayCircleActive]}>
                      <Text style={[s.dayCircleText, isSelected && s.dayCircleTextActive]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    {isToday && !isSelected && <View style={s.todayDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Day Summary */}
            <View style={s.weekCard}>
              <Text style={s.weekLabel}>{dayLabel}</Text>

              <View style={s.cardRow}>
                <Image source={require("../../../assets/illustrations/money.png")} style={s.cardIllustration} resizeMode="contain" />
                <View style={[s.statsRow, { flex: 1 }]}>
                  <View style={s.statItem}>
                    <Text style={s.statValue}>₹{dayEarnings}</Text>
                    <Text style={s.statLabel}>{t("earnings.earningsLabel")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.successTint }]}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                    </View>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{Math.floor(dayMinutes / 60)}h {dayMinutes % 60}m</Text>
                    <Text style={s.statLabel}>{t("earnings.timeSpent")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.infoTint }]}>
                      <Ionicons name="time-outline" size={14} color={COLORS.info} />
                    </View>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{dayTrips.length}</Text>
                    <Text style={s.statLabel}>{t("earnings.tripsTaken")}</Text>
                    <View style={[s.statBadge, { backgroundColor: COLORS.primaryTint }]}>
                      <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Trip List */}
            {dayTrips.length > 0 ? (
              <View style={s.tripList}>
                <Text style={s.sectionLabel}>{t("earnings.trips")}</Text>
                {dayTrips.map(b => (
                  <View key={b.booking_id} style={s.tripRow}>
                    <View>
                      <Text style={s.tripLabel}>{t("earnings.trip")}</Text>
                      <Text style={s.tripTime}>{fmtTime(b.completed_at || b.created_at)}</Text>
                    </View>
                    <Text style={s.tripAmount}>+₹{Math.round((b.fare || 0) * 0.80)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="car-outline" size={44} color="#DDD" />
                <Text style={s.emptyText}>{t("earnings.noTripsToday")}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.bgAlt },

  // ── Hero — full-bleed gradient, same technique as home/orders ──────────
  hero:               { paddingHorizontal: 20, paddingBottom: 24, minHeight: 170 },
  logoBar:            { flexDirection: "row", alignItems: "center", paddingTop: 52, paddingBottom: 8 },
  logo:               { width: 180, height: 64, marginLeft: -38 },
  heroTruckImg:       { position: "absolute", right: -20, bottom: -14, width: 250, height: 156 },
  heroTextCol:        { maxWidth: "58%", marginTop: 8 },
  pageTitle:          { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },

  loadingWrap:        { paddingTop: 60, alignItems: "center" },
  cardRow:            { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 },
  cardIllustration:   { width: 64, height: 64, flexShrink: 0 },
  statBadge:          { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 6 },
  rangeCard:          { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 16, marginHorizontal: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, elevation: 3 },
  rangeStatsRow:      { flexDirection: "row", alignItems: "flex-start" },
  rangeStatItem:      { flex: 1, alignItems: "center" },
  rangeStatValue:     { fontSize: 16, fontWeight: "800" },
  rangeStatLabel:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  weekCard:           { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, marginHorizontal: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, elevation: 3 },
  weekLabel:          { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginBottom: 16, letterSpacing: 1 },
  statsRow:           { flexDirection: "row", alignItems: "flex-start" },
  statItem:           { flex: 1, alignItems: "center" },
  statDivider:        { width: 1, height: 64, backgroundColor: COLORS.border },
  statValue:          { fontSize: 20, fontWeight: "800", color: COLORS.textStrong },
  statLabel:          { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: "center" },
  daySelectorWrap:    { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  dayCol:             { alignItems: "center", paddingHorizontal: 10, gap: 6, marginRight: 4 },
  dayName:            { fontSize: 11, fontWeight: "600", color: COLORS.textMuted },
  dayNameActive:      { color: COLORS.primary },
  dayCircle:          { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.border },
  dayCircleActive:    { backgroundColor: COLORS.primary },
  dayCircleText:      { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  dayCircleTextActive:{ color: "#FFF" },
  todayDot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  tripList:           { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 16, marginBottom: 40 },
  sectionLabel:       { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 8 },
  tripRow:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  tripLabel:          { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  tripTime:           { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tripAmount:         { fontSize: 15, fontWeight: "700", color: COLORS.success },
  empty:              { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText:          { color: COLORS.textMuted, fontSize: 14 },
});
