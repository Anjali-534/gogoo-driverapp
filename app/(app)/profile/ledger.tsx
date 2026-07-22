import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { COLORS, RADIUS } from "@/constants/theme";
import EarningsRangeFilter, { EarningsRange } from "@/components/EarningsRangeFilter";
import { useTranslation } from "react-i18next";
// expo-file-system / expo-sharing are NATIVE modules — required lazily
// inside downloadStatement (not statically imported here) because the
// currently-installed native binary predates them. A static top-level
// import would crash the whole screen the moment this file loads, before
// anything renders, since the native module registration is missing.
// Requiring them only when the button is actually pressed means a missing
// native module degrades to "this one action doesn't work yet" instead of
// "the whole screen is unreachable." Remove this indirection once a fresh
// eas build (not just eas update) ships with these modules compiled in.

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const DRIVER_TOPUP_MIN = 50;
const DRIVER_TOPUP_MAX = 10000;
const DRIVER_WITHDRAW_MIN = 100;

// Last 6 months, most recent first — { key: "2026-07", label: "Jul 2026" }
function lastSixMonths() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    out.push({ key, label });
  }
  return out;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function entryLabel(entry: any, t: (key: string, opts?: any) => string): string {
  if (entry.debit_type === "registration_fee") return t("profile.ledger.entryLabels.registrationFee");
  if (entry.debit_type === "commission")       return t("profile.ledger.entryLabels.commission");
  if (entry.type === "ride")                   return t("profile.ledger.entryLabels.tripEarnings");
  if (entry.type === "referral")               return t("profile.ledger.entryLabels.referralBonus");
  if (entry.type === "topup")                  return t("profile.ledger.entryLabels.topup");
  if (entry.type === "withdrawal")             return t("profile.ledger.entryLabels.withdrawal");
  return entry.description || t("profile.ledger.entryLabels.transaction");
}

export default function LedgerScreen() {
  const { t } = useTranslation();
  const [wallet,    setWallet]    = useState<any>(null);
  const [entries,   setEntries]   = useState<any[]>([]);
  const [rangeSummary, setRangeSummary] = useState<any>(null);
  const [range,     setRange]     = useState<EarningsRange>("this_week");
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(lastSixMonths()[0].key);
  const [downloading,   setDownloading]   = useState(false);
  const router = useRouter();

  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const downloadStatement = async (month: string) => {
    setDownloading(true);
    let FileSystem: any, Sharing: any;
    try {
      // Lazy require — see import-site comment. If the native module isn't
      // compiled into this build yet, this throws here (caught below) and
      // only this button is affected, not the whole screen.
      FileSystem = require("expo-file-system");
      Sharing = require("expo-sharing");
    } catch {
      Alert.alert(
        t("profile.ledger.updateNeededTitle"),
        t("profile.ledger.updateNeededMsg")
      );
      setDownloading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem("driver_token");
      const url = `${API}/gogoo/driver/ledger/pdf?month=${month}`;
      const fileUri = FileSystem.documentDirectory + `bogie-ledger-${month}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (status !== 200) {
        Alert.alert(t("profile.ledger.downloadErrorTitle"), t("profile.ledger.downloadErrorMsg"));
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      }
    } catch {
      Alert.alert(t("profile.ledger.downloadErrorTitle"), t("profile.ledger.downloadErrorMsg"));
    } finally {
      setDownloading(false);
    }
  };

  const fetchData = useCallback(async (isRefresh = false, forRange: EarningsRange = range) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [walletRes, ledgerRes] = await Promise.allSettled([
        api.get(`/gogoo/driver/wallet`),
        api.get(`/gogoo/driver/ledger`, { params: { range: forRange } }),
      ]);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value.data);
      if (ledgerRes.status === "fulfilled") {
        setEntries(ledgerRes.value.data?.transactions || []);
        setRangeSummary(ledgerRes.value.data || null);
      }
    } catch { /* silently fail, show empty */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [range]);

  useEffect(() => { fetchData(); }, []);

  const changeRange = async (r: EarningsRange) => {
    setRange(r);
    setRangeLoading(true);
    try {
      const res = await api.get(`/gogoo/driver/ledger`, { params: { range: r } });
      setEntries(res.data?.transactions || []);
      setRangeSummary(res.data || null);
    } catch { /* keep showing previous range on failure */ }
    finally { setRangeLoading(false); }
  };

  const balance          = wallet?.wallet_balance ?? 0;
  const withdrawable     = Math.round(wallet?.withdrawable_amount ?? 0);
  const canWithdraw      = wallet?.can_withdraw ?? false;
  const isBlocked        = wallet?.is_wallet_blocked ?? false;
  const isLow            = !isBlocked && balance < 0;
  const paymentsAvailable = wallet?.payments_available ?? false;
  const payoutsAvailable  = wallet?.payouts_available ?? false;

  const handleAddMoneyPress = () => {
    if (!paymentsAvailable) {
      Alert.alert(t("profile.ledger.paymentsComingSoonTitle"), t("profile.ledger.paymentsComingSoonSub"));
      return;
    }
    setAddAmount("");
    setAddMoneyOpen(true);
  };

  const handleProceedToPay = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt < DRIVER_TOPUP_MIN || amt > DRIVER_TOPUP_MAX) {
      Alert.alert(
        t("common.error"),
        t("profile.ledger.addMoneyInvalidAmount", { min: DRIVER_TOPUP_MIN, max: DRIVER_TOPUP_MAX })
      );
      return;
    }
    setCreatingOrder(true);
    try {
      await api.post(`/gogoo/driver/wallet/topup/create-order`, { amount: amt });
      setAddMoneyOpen(false);
      // The server never trusts a client-side "success" — only the
      // signature-verified webhook (POST /gogoo/driver/wallet/topup/webhook)
      // ever credits a top-up. Once react-native-razorpay is wired up here,
      // this stub is replaced by opening the real checkout with the
      // returned order_id, same as the rider wallet's TODO(razorpay-integration).
      Alert.alert(t("profile.ledger.checkoutStubTitle"), t("profile.ledger.checkoutStubMsg"), [
        { text: t("common.ok"), onPress: () => fetchData() },
      ]);
    } catch (e: any) {
      if (e?.response?.status === 503) {
        setAddMoneyOpen(false);
        Alert.alert(t("profile.ledger.paymentsComingSoonTitle"), t("profile.ledger.paymentsComingSoonSub"));
      } else {
        Alert.alert(t("common.error"), e?.response?.data?.error || t("profile.ledger.addMoneyOrderFailed"));
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleWithdrawPress = () => {
    if (!payoutsAvailable) {
      Alert.alert(t("profile.ledger.payoutsComingSoonTitle"), t("profile.ledger.payoutsComingSoonSub"));
      return;
    }
    setWithdrawAmount(withdrawable > 0 ? String(withdrawable) : "");
    setWithdrawOpen(true);
  };

  const submitWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < DRIVER_WITHDRAW_MIN) {
      Alert.alert(t("common.error"), t("profile.ledger.withdrawMinAmount", { min: DRIVER_WITHDRAW_MIN }));
      return;
    }
    if (amt > withdrawable) {
      Alert.alert(t("common.error"), t("profile.ledger.withdrawExceedsBalance", { amount: withdrawable }));
      return;
    }
    setSubmittingWithdraw(true);
    try {
      await api.post(`/gogoo/driver/wallet/withdraw`, { amount: amt });
      setWithdrawOpen(false);
      Alert.alert(t("profile.ledger.withdrawSubmittedTitle"), t("profile.ledger.withdrawSubmittedSub"));
      fetchData();
    } catch (e: any) {
      const data = e?.response?.data;
      if (e?.response?.status === 503) {
        setWithdrawOpen(false);
        Alert.alert(t("profile.ledger.payoutsComingSoonTitle"), t("profile.ledger.payoutsComingSoonSub"));
      } else if (data?.missing_payout_details) {
        setWithdrawOpen(false);
        Alert.alert(t("profile.ledger.missingPayoutDetailsTitle"), t("profile.ledger.missingPayoutDetailsSub"));
      } else {
        Alert.alert(t("common.error"), data?.error || t("profile.ledger.withdrawFailed"));
      }
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.ledger.title")}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Blocked warning */}
          {isBlocked && (
            <View style={s.blockedBanner}>
              <Ionicons name="ban-outline" size={18} color="#991B1B" />
              <View style={{ flex: 1 }}>
                <Text style={s.blockedText}>
                  {t("profile.ledger.blockedText")}
                </Text>
              </View>
            </View>
          )}

          {/* Low balance warning */}
          {isLow && (
            <View style={s.warningBanner}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
              <Text style={s.warningText}>
                {t("profile.ledger.lowBalanceText")}
              </Text>
            </View>
          )}

          {/* Balance Card */}
          <View style={[s.balanceCard, { backgroundColor: balance >= 0 ? "#F0FDF4" : "#FFF1F2" }]}>
            <View style={s.balanceRow}>
              <View>
                <Text style={s.balanceLabel}>{t("profile.ledger.balanceLabel")}</Text>
                <Text style={[s.balanceAmount, { color: balance >= 0 ? COLORS.success : COLORS.danger }]}>
                  {balance >= 0 ? "+" : ""}₹{Math.round(balance)}
                </Text>
              </View>
              <View style={s.minBalance}>
                <Text style={s.minBalanceText}>{t("profile.ledger.minBalanceLabel")}</Text>
                <Text style={s.minBalanceValue}>₹500</Text>
              </View>
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.withdrawBtn, !canWithdraw && s.btnDisabled]}
                disabled={!canWithdraw}
                onPress={handleWithdrawPress}
              >
                <Text style={s.withdrawBtnText}>
                  {t("profile.ledger.withdraw", { amount: withdrawable })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={handleAddMoneyPress}>
                <Text style={s.clearBtnText}>{t("profile.ledger.addMoney")}</Text>
              </TouchableOpacity>
            </View>
            {!payoutsAvailable && (
              <Text style={s.infoText}>{t("profile.ledger.payoutsComingSoonInline")}</Text>
            )}
            <Text style={s.infoText}>{t("profile.ledger.maintainInfo")}</Text>
          </View>

          {wallet && (
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={s.statChipLabel}>{t("profile.ledger.totalEarnings")}</Text>
                <Text style={s.statChipValue}>₹{Math.round(wallet.total_earnings ?? 0)}</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statChipLabel}>{t("profile.ledger.totalRides")}</Text>
                <Text style={s.statChipValue}>{wallet.total_rides ?? 0}</Text>
              </View>
            </View>
          )}

          {/* Statement download */}
          <View style={s.statementCard}>
            <Text style={s.sectionLabel}>{t("profile.ledger.monthlyStatement")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.monthRow}
            >
              {lastSixMonths().map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.monthChip, selectedMonth === m.key && s.monthChipActive]}
                  onPress={() => setSelectedMonth(m.key)}
                >
                  <Text style={[s.monthChipText, selectedMonth === m.key && s.monthChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[s.downloadBtn, downloading && s.btnDisabled]}
              disabled={downloading}
              onPress={() => downloadStatement(selectedMonth)}
            >
              {downloading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={s.downloadBtnText}>{t("profile.ledger.downloadStatement")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Date range filter */}
          <Text style={s.sectionLabel}>{t("earnings.filterByPeriod")}</Text>
          <EarningsRangeFilter selected={range} onSelect={changeRange} rangeLabel={rangeSummary?.range_label} />

          {rangeSummary && (
            <View style={s.rangeSummaryRow}>
              <View style={s.rangeSummaryChip}>
                <Text style={s.rangeSummaryLabel}>{t("earnings.earned")}</Text>
                <Text style={[s.rangeSummaryValue, { color: COLORS.success }]}>
                  ₹{Math.round(rangeSummary.total_earned ?? 0)}
                </Text>
              </View>
              <View style={s.rangeSummaryChip}>
                <Text style={s.rangeSummaryLabel}>{t("earnings.debited")}</Text>
                <Text style={[s.rangeSummaryValue, { color: COLORS.danger }]}>
                  ₹{Math.round(rangeSummary.total_debited ?? 0)}
                </Text>
              </View>
              <View style={s.rangeSummaryChip}>
                <Text style={s.rangeSummaryLabel}>{t("earnings.net")}</Text>
                <Text style={[s.rangeSummaryValue, { color: (rangeSummary.net ?? 0) >= 0 ? COLORS.success : COLORS.danger }]}>
                  {(rangeSummary.net ?? 0) >= 0 ? "+" : ""}₹{Math.round(rangeSummary.net ?? 0)}
                </Text>
              </View>
            </View>
          )}

          <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("profile.ledger.transactions")}</Text>

          {rangeLoading ? (
            <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
          ) : entries.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color="#DDD" />
              <Text style={s.emptyTitle}>{t("profile.ledger.noTransactions")}</Text>
              <Text style={s.emptySub}>{t("profile.ledger.noTransactionsSub")}</Text>
            </View>
          ) : (
            <View style={s.list}>
              {entries.map(e => {
                const isDebit = e.is_debit ?? false;
                const amount = Number(e.amount) || 0;
                const crn = e.booking_id ? String(e.booking_id).slice(-6).toUpperCase() : null;
                return (
                  <View key={e.id} style={s.txRow}>
                    <View style={[s.txIconWrap, { backgroundColor: isDebit ? "#FEF2F2" : "#F0FDF4" }]}>
                      <Ionicons
                        name={isDebit ? "remove-circle-outline" : "add-circle-outline"}
                        size={18}
                        color={isDebit ? COLORS.danger : COLORS.success}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.txLabel}>{entryLabel(e, t)}</Text>
                      {crn && <Text style={s.txSub}>{t("profile.ledger.crn", { crn })}</Text>}
                      <Text style={s.txDate}>{fmtDate(e.created_at)}</Text>
                    </View>
                    <Text style={[s.txAmount, { color: isDebit ? COLORS.danger : COLORS.success }]}>
                      {isDebit ? "-" : "+"}₹{Math.round(amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={addMoneyOpen} transparent animationType="slide" onRequestClose={() => setAddMoneyOpen(false)}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t("profile.ledger.addMoneyModalTitle")}</Text>
            <Text style={s.modalLabel}>{t("profile.ledger.addMoneyAmountLabel")}</Text>
            <View style={s.amountInputRow}>
              <Text style={s.amountPrefix}>₹</Text>
              <TextInput
                style={s.amountInput}
                placeholder={t("profile.ledger.addMoneyAmountPlaceholder")}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={addAmount}
                onChangeText={setAddAmount}
                autoFocus
              />
            </View>
            <Text style={s.modalHint}>
              {t("profile.ledger.addMoneyRangeHint", { min: DRIVER_TOPUP_MIN, max: DRIVER_TOPUP_MAX })}
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setAddMoneyOpen(false)} disabled={creatingOrder}>
                <Text style={s.modalCancelText}>{t("common.cancel", { defaultValue: "Cancel" })}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalProceedBtn, creatingOrder && { opacity: 0.7 }]}
                onPress={handleProceedToPay}
                disabled={creatingOrder}
              >
                {creatingOrder ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.modalProceedText}>{t("profile.ledger.addMoneyProceed")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={withdrawOpen} transparent animationType="slide" onRequestClose={() => setWithdrawOpen(false)}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t("profile.ledger.withdrawModalTitle")}</Text>
            <Text style={s.modalLabel}>{t("profile.ledger.withdrawAmountLabel")}</Text>
            <View style={s.amountInputRow}>
              <Text style={s.amountPrefix}>₹</Text>
              <TextInput
                style={s.amountInput}
                placeholder={t("profile.ledger.withdrawAmountPlaceholder")}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                autoFocus
              />
            </View>
            <Text style={s.modalHint}>
              {t("profile.ledger.withdrawRangeHint", { min: DRIVER_WITHDRAW_MIN, max: withdrawable })}
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setWithdrawOpen(false)} disabled={submittingWithdraw}>
                <Text style={s.modalCancelText}>{t("common.cancel", { defaultValue: "Cancel" })}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalProceedBtn, submittingWithdraw && { opacity: 0.7 }]}
                onPress={submitWithdrawal}
                disabled={submittingWithdraw}
              >
                {submittingWithdraw ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.modalProceedText}>{t("profile.ledger.withdrawProceed")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bgAlt },
  header:          { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:            { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerTitle:     { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  center:          { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:          { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  blockedBanner:   { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FEE2E2", borderRadius: RADIUS.input, borderLeftWidth: 4, borderLeftColor: COLORS.danger, padding: 14, marginBottom: 12 },
  blockedText:     { fontSize: 13, color: "#991B1B", fontWeight: "600", lineHeight: 18 },
  warningBanner:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: RADIUS.input, borderLeftWidth: 4, borderLeftColor: COLORS.warning, padding: 12, marginBottom: 12 },
  warningText:     { fontSize: 12, color: COLORS.warningStrong, fontWeight: "600", flex: 1 },
  balanceCard:     { borderRadius: RADIUS.card, padding: 20, marginBottom: 16 },
  balanceRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  balanceLabel:    { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  balanceAmount:   { fontSize: 32, fontWeight: "900" },
  minBalance:      { alignItems: "flex-end" },
  minBalanceText:  { color: COLORS.textMuted, fontSize: 11 },
  minBalanceValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "700" },
  btnRow:          { flexDirection: "row", gap: 10, marginBottom: 12 },
  withdrawBtn:     { flex: 1, backgroundColor: COLORS.warning, borderRadius: RADIUS.input, paddingVertical: 12, alignItems: "center" },
  btnDisabled:     { opacity: 0.4 },
  withdrawBtnText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "700" },
  clearBtn:        { flex: 1, borderWidth: 1.5, borderColor: COLORS.info, borderRadius: RADIUS.input, paddingVertical: 12, alignItems: "center" },
  clearBtnText:    { color: COLORS.info, fontSize: 14, fontWeight: "700" },
  infoText:        { color: COLORS.textMuted, fontSize: 11, textAlign: "center" },
  statsRow:        { flexDirection: "row", gap: 10, marginBottom: 16 },
  statChip:        { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.input, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 14, alignItems: "center" },
  statChipLabel:   { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginBottom: 4 },
  statChipValue:   { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  statementCard:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 16, marginBottom: 16 },
  monthRow:        { paddingBottom: 12 },
  monthChip:       { borderWidth: 1.5, borderColor: COLORS.borderStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.bgAlt, marginRight: 8 },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipText:       { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  monthChipTextActive: { color: "#FFF" },
  downloadBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 12 },
  downloadBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sectionLabel:    { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 10 },
  rangeSummaryRow:   { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 4 },
  rangeSummaryChip:  { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.input, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 12, alignItems: "center" },
  rangeSummaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginBottom: 4 },
  rangeSummaryValue: { fontSize: 15, fontWeight: "800" },
  list:            { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden" },
  txRow:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F5", gap: 12 },
  txIconWrap:      { width: 36, height: 36, borderRadius: RADIUS.input, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  txLabel:         { color: COLORS.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  txSub:           { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  txDate:          { color: COLORS.textMuted, fontSize: 11 },
  txAmount:        { fontSize: 15, fontWeight: "700", flexShrink: 0 },
  empty:           { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle:      { color: "#333", fontSize: 16, fontWeight: "700" },
  emptySub:        { color: "#AAA", fontSize: 13 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard:     { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 34 },
  modalTitle:    { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary, marginBottom: 16 },
  modalLabel:    { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  amountInputRow:{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgAlt, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, paddingHorizontal: 16 },
  amountPrefix:  { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, marginRight: 6 },
  amountInput:   { flex: 1, fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, paddingVertical: 14 },
  modalHint:     { fontSize: 12, color: "#999", marginTop: 8, marginBottom: 20 },
  modalBtnRow:   { flexDirection: "row", gap: 12 },
  modalCancelBtn:{ flex: 1, paddingVertical: 16, borderRadius: RADIUS.card, alignItems: "center", backgroundColor: COLORS.bgAlt, borderWidth: 1, borderColor: COLORS.borderSubtle },
  modalCancelText:{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 15 },
  modalProceedBtn:{ flex: 1.4, paddingVertical: 16, borderRadius: RADIUS.card, alignItems: "center", backgroundColor: COLORS.primary },
  modalProceedText:{ color: "#fff", fontWeight: "800", fontSize: 15 },
});
