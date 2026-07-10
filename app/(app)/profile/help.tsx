import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, Linking, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SOSButton from "../../../components/SOSButton";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const EMERGENCY_NUMBERS = [
  { key: "police",    number: "112" },
  { key: "ambulance", number: "108" },
];

const FAQ_KEYS = [
  { section: "rideIssues", items: ["accept", "cancel"] },
  { section: "earnings",   items: ["paid", "commission", "negativeBalance"] },
  { section: "documents",  items: ["rejected", "verifyTime"] },
  { section: "technical",  items: ["noRides", "gpsInaccurate"] },
];

export default function HelpScreen() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  const EMERGENCY_LIST = EMERGENCY_NUMBERS.map(e => ({ ...e, label: t(`profile.help.emergencyNumbers.${e.key}`) }));
  const FAQS = FAQ_KEYS.map(sec => ({
    section: t(`profile.help.faq.sections.${sec.section}`),
    items: sec.items.map(k => ({
      q: t(`profile.help.faq.${sec.section}.${k}.q`),
      a: t(`profile.help.faq.${sec.section}.${k}.a`),
    })),
  }));

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [savedContact, setSavedContact] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("emergency_contact").then(raw => {
      if (!raw) return;
      try {
        const c = JSON.parse(raw);
        setSavedContact(c);
        setContactName(c.name || "");
        setContactPhone(c.phone || "");
      } catch {}
    });
  }, []);

  const saveContact = async () => {
    const phone = contactPhone.trim();
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert(t("profile.help.invalidPhone"));
      return;
    }
    const contact = { name: contactName.trim(), phone };
    try {
      await AsyncStorage.setItem("emergency_contact", JSON.stringify(contact));
      setSavedContact(contact);
      Alert.alert(t("profile.help.savedTitle"), t("profile.help.savedMsg"));
    } catch {
      Alert.alert(t("common.error"), t("profile.help.saveErrorMsg"));
    }
  };

  const removeContact = async () => {
    try {
      await AsyncStorage.removeItem("emergency_contact");
      setSavedContact(null);
      setContactName("");
      setContactPhone("");
    } catch {}
  };

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.help.title")}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SOSButton variant="inline" />

        <Text style={s.sectionLabel}>{t("profile.help.emergencyNumbersTitle")}</Text>
        <View style={s.sectionCard}>
          {EMERGENCY_LIST.map((e, i) => (
            <TouchableOpacity
              key={e.key}
              style={[s.emergRow, i > 0 && s.divider]}
              onPress={() => Linking.openURL(`tel:${e.number}`)}
            >
              <Text style={s.faqQText}>{e.label}</Text>
              <Text style={s.emergNumber}>{e.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t("profile.help.emergencyContactTitle")}</Text>
        <View style={[s.sectionCard, { padding: 16 }]}>
          <Text style={s.contactLabel}>{t("profile.help.nameLabel")}</Text>
          <TextInput
            style={s.contactInput}
            value={contactName}
            onChangeText={setContactName}
            placeholder={t("profile.help.namePlaceholder")}
            placeholderTextColor="#AAA"
          />
          <Text style={[s.contactLabel, { marginTop: 12 }]}>{t("profile.help.phoneLabel")}</Text>
          <TextInput
            style={s.contactInput}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder={t("profile.help.phonePlaceholder")}
            placeholderTextColor="#AAA"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Text style={s.contactHint}>
            {t("profile.help.contactHint")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={s.saveContactBtn} onPress={saveContact}>
              <Text style={s.saveContactBtnTxt}>{savedContact ? t("common.update") : t("common.save")}</Text>
            </TouchableOpacity>
            {savedContact && (
              <TouchableOpacity style={s.removeContactBtn} onPress={removeContact}>
                <Text style={s.removeContactBtnTxt}>{t("common.remove")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {FAQS.map(section => (
          <View key={section.section}>
            <Text style={s.sectionLabel}>{section.section}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, i) => {
                const key = `${section.section}-${i}`;
                const open = expanded === key;
                return (
                  <View key={key} style={i < section.items.length - 1 ? s.divider : undefined}>
                    <TouchableOpacity
                      style={s.faqQ}
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.faqQText}>{item.q}</Text>
                      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    {open && <Text style={s.faqA}>{item.a}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={s.contactCard}>
          <Text style={s.contactTitle}>{t("profile.help.contactSupportTitle")}</Text>
          <TouchableOpacity
            style={s.contactRow}
            onPress={() => Linking.openURL("mailto:driver-support@bogie.in")}
          >
            <View style={s.contactIcon}>
              <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={s.contactLink}>driver-support@bogie.in</Text>
          </TouchableOpacity>
          <View style={s.contactRow}>
            <View style={s.contactIcon}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
            </View>
            <Text style={s.contactSub}>{t("profile.help.contactAvailability")}</Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bgAlt },
  header:       { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:         { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  scroll:       { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 8, marginTop: 20 },
  sectionCard:  { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 4 },
  divider:      { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  faqQ:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, gap: 12 },
  faqQText:     { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqA:         { paddingHorizontal: 16, paddingBottom: 14, color: "#6B7280", fontSize: 14, lineHeight: 21 },
  contactCard:  { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, marginTop: 20, gap: 12 },
  contactTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  contactRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  contactIcon:  { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  contactLink:  { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  contactSub:   { color: "#6B7280", fontSize: 14 },

  emergRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  emergNumber:  { color: "#374151", fontSize: 14, fontWeight: "700" },

  contactLabel:     { color: "#6B7280", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  contactInput:     { backgroundColor: COLORS.bgSubtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.borderSubtle },
  contactHint:      { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginTop: 10 },
  saveContactBtn:   { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 13, alignItems: "center" },
  saveContactBtnTxt:{ color: "#fff", fontWeight: "800", fontSize: 14 },
  removeContactBtn: { flex: 1, backgroundColor: COLORS.dangerTint, borderRadius: RADIUS.input, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#FCA5A5" },
  removeContactBtnTxt:{ color: COLORS.danger, fontWeight: "800", fontSize: 14 },
});
