import React, { useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const MODULE_KEYS = [
  { id: 1, key: "gettingStarted", status: "done",   icon: "✅", itemKeys: ["useApp", "acceptReject", "navigation", "onlineOffline"] },
  { id: 2, key: "customerService", status: "done",  icon: "✅", itemKeys: ["excellentService", "greeting", "complaints", "ratingSystem"] },
  { id: 3, key: "safetyGuidelines", status: "open", icon: "📖", itemKeys: ["roadSafety", "trafficRules", "emergencyProcedures", "accidentReporting"] },
  { id: 4, key: "earningsPayments", status: "locked", icon: "🔒", subtitleKey: "unlockAfter3", itemKeys: ["understandingEarnings", "ledgerCommissions", "withdrawalProcess"] },
  { id: 5, key: "advancedTips", status: "locked", icon: "🔒", subtitleKey: "unlockAfter4", itemKeys: ["peakHours", "highDemandAreas", "maximizingRatings"] },
];

export default function TrainingScreen() {
  const { t } = useTranslation();
  const MODULES = MODULE_KEYS.map(m => ({
    id: m.id, status: m.status, icon: m.icon,
    title: t(`profile.training.modules.${m.key}.title`),
    subtitle: m.subtitleKey ? t(`profile.training.${m.subtitleKey}`) : undefined,
    items: m.itemKeys.map(k => t(`profile.training.modules.${m.key}.items.${k}`)),
  }));
  const [expanded, setExpanded] = useState<number | null>(1);
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.training.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.banner}>
          <Text style={s.bannerIcon}>🎓</Text>
          <Text style={s.bannerTitle}>{t("profile.training.bannerTitle")}</Text>
          <Text style={s.bannerSub}>{t("profile.training.bannerSub")}</Text>
        </View>

        {MODULES.map(mod => {
          const isExpanded = expanded === mod.id;
          const isLocked = mod.status === "locked";
          return (
            <TouchableOpacity
              key={mod.id}
              style={[s.moduleCard, isLocked && s.moduleLocked]}
              onPress={() => !isLocked && setExpanded(isExpanded ? null : mod.id)}
              activeOpacity={isLocked ? 1 : 0.75}
            >
              <View style={s.moduleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.moduleNum}>{t("profile.training.moduleNum", { num: mod.id })}</Text>
                  <Text style={[s.moduleTitle, isLocked && s.moduleTitleLocked]}>{mod.title}</Text>
                  {mod.subtitle && <Text style={s.moduleSub}>{mod.subtitle}</Text>}
                </View>
                <View style={s.moduleRight}>
                  <Text style={s.moduleIcon}>{mod.icon}</Text>
                  {!isLocked && (
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={COLORS.textMuted}
                    />
                  )}
                </View>
              </View>

              {isExpanded && !isLocked && (
                <View style={s.moduleContent}>
                  {mod.items.map(item => (
                    <View key={item} style={s.moduleItem}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={s.moduleItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={s.supportCard}>
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <Text style={s.supportText}>
            {t("profile.training.support")} <Text style={s.supportEmail}>support@bogie.in</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.bgAlt },
  header:             { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:               { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerTitle:        { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  scroll:             { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  banner:             { alignItems: "center", paddingVertical: 24, gap: 4 },
  bannerIcon:         { fontSize: 40 },
  bannerTitle:        { color: COLORS.textPrimary, fontSize: 22, fontWeight: "900", marginTop: 8 },
  bannerSub:          { color: COLORS.textSecondary, fontSize: 14 },
  moduleCard:         { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 18, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  moduleLocked:       { opacity: 0.55 },
  moduleHeader:       { flexDirection: "row", alignItems: "flex-start" },
  moduleNum:          { fontSize: 11, fontWeight: "700", color: COLORS.primary, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  moduleTitle:        { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 2 },
  moduleTitleLocked:  { color: COLORS.textMuted },
  moduleSub:          { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  moduleRight:        { flexDirection: "row", alignItems: "center", gap: 6 },
  moduleIcon:         { fontSize: 22 },
  moduleContent:      { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F5F5F5", gap: 10 },
  moduleItem:         { flexDirection: "row", alignItems: "center", gap: 10 },
  moduleItemText:     { color: "#374151", fontSize: 14, flex: 1 },
  supportCard:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.input, padding: 16, marginTop: 8 },
  supportText:        { color: "#374151", fontSize: 14 },
  supportEmail:       { color: COLORS.primary, fontWeight: "700" },
});
