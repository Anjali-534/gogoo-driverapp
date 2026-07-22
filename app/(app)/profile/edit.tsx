import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, StatusBar, Alert, Platform, ActionSheetIOS,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Bengali", "Marathi"];

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [appLang, setAppLang] = useState("English");
  const [trainingLang, setTrainingLang] = useState("Hindi");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get(`/gogoo/driver/profile`);
      setProfile(res.data);
      setHomeAddress(res.data.home_address || "");
    } catch {
      const u = await AsyncStorage.getItem("driver_user");
      if (u) setProfile(JSON.parse(u));
    }
  };

  const showLangPicker = (current: string, onSelect: (l: string) => void) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...LANGUAGES, "Cancel"], cancelButtonIndex: LANGUAGES.length },
        idx => { if (idx < LANGUAGES.length) onSelect(LANGUAGES[idx]); }
      );
    } else {
      Alert.alert(
        t("profile.edit.selectLanguage"),
        "",
        LANGUAGES.map(l => ({ text: l + (l === current ? " ✓" : ""), onPress: () => onSelect(l) }))
          .concat([{ text: t("common.cancel"), style: "cancel" } as any])
      );
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/gogoo/driver/profile`, { home_address: homeAddress });
      Alert.alert(t("profile.edit.savedTitle"), t("profile.edit.savedMsg"));
    } catch {
      Alert.alert(t("profile.edit.savedLocallyTitle"), t("profile.edit.savedLocallyMsg"));
    } finally { setSaving(false); }
  };

  const name = profile?.name || t("profile.edit.defaultDriverName");
  const initial = name[0].toUpperCase();
  const rating = profile?.rating != null ? Number(profile.rating).toFixed(1) : "5.0";
  const vehicleType = profile?.vehicle_type || profile?.vehicle?.type || "—";
  const vehicleNumber = profile?.vehicle_number || profile?.vehicle?.number || "—";
  const phone = profile?.phone || profile?.mobile || "—";
  const statusActive = profile?.status === "active";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.edit.title")}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.name}>{name}</Text>
              <View style={[s.statusDot, { backgroundColor: statusActive ? COLORS.success : COLORS.warning }]} />
            </View>
            <Text style={s.ratingText}>⭐ {rating}</Text>
            <Text style={s.vehicle}>{vehicleType} • {vehicleNumber}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>{t("profile.edit.personalInfo")}</Text>
        <View style={s.fieldsCard}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>{t("profile.edit.homeAddress")}</Text>
            <TextInput
              style={s.fieldInput}
              value={homeAddress}
              onChangeText={setHomeAddress}
              placeholder={t("profile.edit.homeAddressPlaceholder")}
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>
          <View style={[s.field, s.fieldDivider]}>
            <Text style={s.fieldLabel}>{t("profile.edit.mobileNumber")}</Text>
            <Text style={s.fieldReadOnly}>{phone}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>{t("profile.edit.languagePrefs")}</Text>
        <View style={s.fieldsCard}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>{t("profile.edit.appLanguage")}</Text>
            <View style={s.fieldRow}>
              <Text style={s.fieldValue}>{appLang}</Text>
              <TouchableOpacity
                style={s.changeBtn}
                onPress={() => showLangPicker(appLang, setAppLang)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={s.changeBtnText}>{t("common.change")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[s.field, s.fieldDivider]}>
            <Text style={s.fieldLabel}>{t("profile.edit.trainingLanguage")}</Text>
            <View style={s.fieldRow}>
              <Text style={s.fieldValue}>{trainingLang}</Text>
              <TouchableOpacity
                style={s.changeBtn}
                onPress={() => showLangPicker(trainingLang, setTrainingLang)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={s.changeBtnText}>{t("common.change")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? t("profile.edit.saving") : t("profile.edit.saveChanges")}</Text>
        </TouchableOpacity>
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
  profileCard:  { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 18, marginBottom: 24 },
  avatar:       { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarText:   { color: "#FFF", fontSize: 24, fontWeight: "900" },
  nameRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  name:         { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800" },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  ratingText:   { color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  vehicle:      { color: COLORS.textMuted, fontSize: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 8 },
  fieldsCard:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 20 },
  field:        { paddingHorizontal: 16, paddingVertical: 14 },
  fieldDivider: { borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  fieldLabel:   { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput:   { color: COLORS.textPrimary, fontSize: 15, paddingVertical: 0 },
  fieldReadOnly:{ color: "#374151", fontSize: 15 },
  fieldRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldValue:   { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },
  changeBtn:    { backgroundColor: COLORS.border, borderRadius: RADIUS.chip, paddingHorizontal: 14, paddingVertical: 6 },
  changeBtnText:{ color: "#374151", fontSize: 13, fontWeight: "700" },
  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText:  { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
