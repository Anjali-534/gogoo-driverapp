import React, { useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, StatusBar, Alert, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("profile.changePassword.errors.fillAllFields"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("profile.changePassword.errors.passwordMin8"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("profile.changePassword.errors.passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      await api.put(`/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert(t("profile.changePassword.successTitle"), t("profile.changePassword.successMsg"), [
        { text: t("common.ok"), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.error || t("profile.changePassword.errors.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.changePassword.title")}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.fieldsCard}>
            <View style={s.field}>
              <Text style={s.fieldLabel}>{t("profile.changePassword.currentPasswordLabel")}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t("profile.changePassword.currentPasswordPlaceholder")}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.field, s.fieldDivider]}>
              <Text style={s.fieldLabel}>{t("profile.changePassword.newPasswordLabel")}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t("profile.changePassword.newPasswordPlaceholder")}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={s.fieldHint}>{t("profile.changePassword.newPasswordHint")}</Text>
            </View>

            <View style={[s.field, s.fieldDivider]}>
              <Text style={s.fieldLabel}>{t("profile.changePassword.confirmPasswordLabel")}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("profile.changePassword.confirmPasswordPlaceholder")}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>{t("profile.changePassword.submitBtn")}</Text>}
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
  fieldsCard:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 16 },
  field:        { paddingHorizontal: 16, paddingVertical: 14 },
  fieldDivider: { borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  fieldLabel:   { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  passwordRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  eyeBtn:        { padding: 12 },
  fieldHint:    { color: "#999", fontSize: 12, marginTop: 6 },
  errorText:    { color: COLORS.danger, fontSize: 13, fontWeight: "600", marginBottom: 16, paddingHorizontal: 4 },
  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:  { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
