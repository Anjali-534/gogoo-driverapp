import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS, RADIUS } from "@/constants/theme";
import LanguagePicker from "@/components/LanguagePicker";

export default function DriverSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Text style={s.backTxt}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t("profile.settings.title")}</Text>
      </View>
      <ScrollView style={s.scroll}>
        <Text style={s.sectionLabel}>{t("profile.settings.account").toUpperCase()}</Text>
        <TouchableOpacity
          style={[s.row, { marginBottom: 10 }]}
          onPress={() => router.push("/(app)/profile/change-password" as any)}
          activeOpacity={0.7}
        >
          <View style={s.rowIconWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.purpleAlt} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>{t("profile.settings.changePassword")}</Text>
            <Text style={s.rowSub}>{t("profile.settings.changePasswordSub")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.row}
          onPress={() => router.push("/(app)/profile/delete-account" as any)}
          activeOpacity={0.7}
        >
          <View style={s.rowIconWrapDanger}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowLabel, { color: COLORS.danger }]}>{t("profile.settings.deleteAccount")}</Text>
            <Text style={s.rowSub}>{t("profile.settings.deleteAccountSub")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CCC" />
        </TouchableOpacity>

        <Text style={s.sectionLabel}>{t("profile.settings.language").toUpperCase()}</Text>
        <View style={s.card}>
          <View style={{ padding: 16, paddingBottom: 4 }}>
            <Text style={s.switchSub}>{t("profile.settings.languageSub")}</Text>
          </View>
          <View style={{ padding: 16, paddingTop: 8 }}>
            <LanguagePicker />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  header:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 36, paddingBottom: 16 },
  back:         { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  backTxt:      { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  title:        { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900" },
  scroll:       { paddingHorizontal: 20 },
  sectionLabel: { color: "#999", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10, marginTop: 10 },
  card:         { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, marginBottom: 20, overflow: "hidden" },
  switchSub:    { color: "#999", fontSize: 12, marginTop: 2 },
  row:          { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 16, marginBottom: 20, gap: 12 },
  rowIconWrap:  { width: 40, height: 40, borderRadius: RADIUS.input, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" },
  rowIconWrapDanger: { width: 40, height: 40, borderRadius: RADIUS.input, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  rowLabel:     { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  rowSub:       { color: "#999", fontSize: 12, marginTop: 2 },
});
