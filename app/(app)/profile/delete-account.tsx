import React, { useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, StatusBar, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { clearSession } from "@/services/session";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

type Step = "password" | "confirm";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

  const checkEligibility = async () => {
    setError("");
    setReasons([]);
    if (!password) {
      setError(t("profile.deleteAccount.errors.passwordRequired"));
      return;
    }
    setChecking(true);
    try {
      const res = await api.post(`/gogoo/driver/account/delete-check`, { password });
      if (res.data?.eligible) {
        setStep("confirm");
      } else {
        setReasons(res.data?.reasons || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || t("profile.deleteAccount.errors.genericError"));
    } finally {
      setChecking(false);
    }
  };

  const confirmDelete = async () => {
    setError("");
    if (!canConfirm) {
      setError(t("profile.deleteAccount.errors.typeDeleteExact"));
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/gogoo/driver/account`, { data: { password } });
      await clearSession();
      router.replace("/(auth)/login");
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.reasons?.length) {
        // Something changed since the pre-check (e.g. a ride was accepted
        // in the meantime) — the backend re-validates independently, so
        // send the driver back to see exactly what's blocking it now.
        setReasons(data.reasons);
        setStep("password");
      } else {
        setError(data?.error || t("profile.deleteAccount.errors.genericError"));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("profile.deleteAccount.title")}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === "password" ? (
            <>
              <View style={s.warningBox}>
                <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
                <Text style={s.warningText}>{t("profile.deleteAccount.warning")}</Text>
              </View>

              <View style={s.fieldsCard}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t("profile.deleteAccount.passwordLabel")}</Text>
                  <View style={s.passwordRow}>
                    <TextInput
                      style={s.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t("profile.deleteAccount.passwordPlaceholder")}
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {reasons.length > 0 && (
                <View style={s.reasonsCard}>
                  <Text style={s.reasonsTitle}>{t("profile.deleteAccount.blockedTitle")}</Text>
                  {reasons.map((r, i) => (
                    <View key={i} style={s.reasonRow}>
                      <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                      <Text style={s.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={[s.dangerBtn, checking && s.btnDisabled]} onPress={checkEligibility} disabled={checking}>
                {checking ? <ActivityIndicator color="#FFF" /> : <Text style={s.dangerBtnText}>{t("profile.deleteAccount.continueBtn")}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.warningBox}>
                <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
                <Text style={s.warningText}>{t("profile.deleteAccount.finalWarning")}</Text>
              </View>

              <View style={s.fieldsCard}>
                <View style={s.field}>
                  <Text style={s.fieldLabel}>{t("profile.deleteAccount.typeDeleteLabel")}</Text>
                  <TextInput
                    style={s.confirmInput}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="DELETE"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[s.dangerBtn, (deleting || !canConfirm) && s.btnDisabled]}
                onPress={confirmDelete}
                disabled={deleting || !canConfirm}
              >
                {deleting ? <ActivityIndicator color="#FFF" /> : <Text style={s.dangerBtnText}>{t("profile.deleteAccount.confirmBtn")}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setStep("password"); setConfirmText(""); setError(""); }}>
                <Text style={s.cancelBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </>
          )}
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

  warningBox:   { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", borderRadius: RADIUS.card, padding: 14, marginBottom: 16 },
  warningText:  { flex: 1, color: "#9F1239", fontSize: 13, lineHeight: 19 },

  fieldsCard:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, overflow: "hidden", marginBottom: 16 },
  field:        { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel:   { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  passwordRow:  { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12 },
  passwordInput:{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  eyeBtn:       { padding: 12 },
  confirmInput: { backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", letterSpacing: 1 },

  reasonsCard:  { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", borderRadius: RADIUS.card, padding: 14, marginBottom: 16, gap: 8 },
  reasonsTitle: { color: "#9F1239", fontSize: 13, fontWeight: "800", marginBottom: 2 },
  reasonRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reasonText:   { flex: 1, color: "#9F1239", fontSize: 13, lineHeight: 18 },

  errorText:    { color: COLORS.danger, fontSize: 13, fontWeight: "600", marginBottom: 16, paddingHorizontal: 4 },

  dangerBtn:      { backgroundColor: COLORS.danger, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnDisabled:    { opacity: 0.5 },
  dangerBtnText:  { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cancelBtn:      { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelBtnText:  { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
});
