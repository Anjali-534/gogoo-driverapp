import React from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

export default function ContactScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const contacts = [
    {
      icon: "call-outline" as const, color: COLORS.success, bg: "#ECFDF5",
      title: t("profile.contact.helpline.title"),
      line1: "+91-XXXXXXXXXX",
      line2: t("profile.contact.helpline.hours"),
      onPress: () => Linking.openURL("tel:+91XXXXXXXXXX"),
    },
    {
      icon: "mail-outline" as const, color: COLORS.info, bg: COLORS.infoTint,
      title: t("profile.contact.email.title"),
      line1: "driver-support@bogie.in",
      line2: t("profile.contact.email.responseTime"),
      onPress: () => Linking.openURL("mailto:driver-support@bogie.in"),
    },
    {
      icon: "chatbubble-outline" as const, color: COLORS.purpleAlt, bg: "#F5F3FF",
      title: t("profile.contact.chat.title"),
      line1: t("profile.contact.chat.line1"),
      line2: t("profile.contact.chat.line2"),
      onPress: null,
    },
    {
      icon: "business-outline" as const, color: COLORS.warning, bg: COLORS.warningTint,
      title: t("profile.contact.office.title"),
      line1: "Aggarwal Publicity and Marketing Pvt. Ltd.",
      line2: "New Delhi, Delhi - 110001",
      onPress: null,
    },
  ];

  const emergencies = [
    { label: t("profile.contact.emergency.danger"),  num: "112" },
    { label: t("profile.contact.emergency.accident"), num: "1073" },
    { label: t("profile.contact.emergency.medical"),  num: "108" },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.contact.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{t("profile.contact.forDrivers")}</Text>

        {contacts.map(item => (
          <TouchableOpacity
            key={item.title}
            style={s.card}
            onPress={item.onPress ?? undefined}
            activeOpacity={item.onPress ? 0.7 : 1}
          >
            <View style={[s.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={[s.cardLine1, item.onPress ? { color: item.color } : {}]}>
                {item.line1}
              </Text>
              <Text style={s.cardLine2}>{item.line2}</Text>
            </View>
            {item.onPress && <Ionicons name="chevron-forward" size={16} color="#CCC" />}
          </TouchableOpacity>
        ))}

        <Text style={s.sectionLabel}>{t("profile.contact.emergency.title")}</Text>
        <View style={s.emergencyCard}>
          {emergencies.map((e, i) => (
            <TouchableOpacity
              key={e.num}
              style={[s.emergencyRow, i < emergencies.length - 1 && s.emergencyDivider]}
              onPress={() => Linking.openURL(`tel:${e.num}`)}
            >
              <Text style={s.emergencyLabel}>{e.label}</Text>
              <Text style={s.emergencyNum}>{t("profile.contact.emergency.call", { num: e.num })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={s.callBtn}
          onPress={() => Linking.openURL("tel:+91XXXXXXXXXX")}
        >
          <Ionicons name="call" size={18} color="#FFF" />
          <Text style={s.callBtnText}>{t("profile.contact.callSupport")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.emailBtn}
          onPress={() => Linking.openURL("mailto:driver-support@bogie.in")}
        >
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <Text style={s.emailBtnText}>{t("profile.contact.emailSupport")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bgAlt },
  header:           { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:             { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerTitle:      { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  scroll:           { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  sectionLabel:     { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  card:             { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 16, marginBottom: 10, gap: 14 },
  iconWrap:         { width: 50, height: 50, borderRadius: RADIUS.input, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardBody:         { flex: 1 },
  cardTitle:        { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardLine1:        { color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 2 },
  cardLine2:        { color: COLORS.textMuted, fontSize: 12 },
  emergencyCard:    { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 20 },
  emergencyRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15 },
  emergencyDivider: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  emergencyLabel:   { color: "#374151", fontSize: 14 },
  emergencyNum:     { color: COLORS.danger, fontSize: 14, fontWeight: "700" },
  callBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 16, marginBottom: 12 },
  callBtnText:      { color: "#FFF", fontSize: 16, fontWeight: "700" },
  emailBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 16, marginBottom: 20 },
  emailBtnText:     { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
});
