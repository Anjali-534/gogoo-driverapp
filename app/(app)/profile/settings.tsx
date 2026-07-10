import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
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
});
