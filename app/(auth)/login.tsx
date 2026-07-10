import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, StatusBar, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { trackDriverLogin } from "@/services/analytics";
import { registerPushToken } from "@/services/notifications";
import LanguageSwitcherButton from "@/components/LanguageSwitcherButton";
import i18n from "@/i18n";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const POLICY_BASE = "https://gogobackend-production.up.railway.app/policies";
const CONSENT_STORAGE_KEY = "legal_consent_v1";

const openPolicy = (url: string) => {
  Linking.openURL(url).catch(() => Alert.alert(i18n.t("common.error"), i18n.t("auth.login.openDocumentError")));
};

export default function DriverLoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading,      setLoading]      = useState(false);
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms,  setAgreedTerms]  = useState(false);
  const [agreedTDS,    setAgreedTDS]    = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_STORAGE_KEY).then(val => {
      if (val) { setAgreedTerms(true); setAgreedTDS(true); }
    });
  }, []);

  const handleLogin = async () => {
  if (!email || !password) { Alert.alert(t("auth.login.fillAllFields")); return; }
  if (!agreedTerms || !agreedTDS) {
    Alert.alert(t("auth.login.acceptTermsAlert"));
    return;
  }
  setLoading(true);
  try {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const token = res.data.access_token;
    await AsyncStorage.setItem("driver_token", token);
    await AsyncStorage.setItem("driver_user", JSON.stringify(res.data.user));
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ agreed: true, at: new Date().toISOString() }));

    // Fetch driver_id using the token
    const profileRes = await axios.get(`${API}/gogoo/driver/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ data: {} }));
    if (profileRes.data?.driver_id) {
      await AsyncStorage.setItem("driver_id", profileRes.data.driver_id);
      trackDriverLogin({
        driverId: profileRes.data.driver_id,
        vehicleType: profileRes.data?.vehicle_type || "unknown",
      });
      registerPushToken();
    }
    router.replace("/(app)/home");
  } catch { Alert.alert(t("common.error"), t("auth.login.loginErrorMsg")); }
  finally { setLoading(false); }
};

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <LanguageSwitcherButton />
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.logoRow}>
          <Image source={require("../../assets/logo.png")} style={{ height: 80, width: 220 }} resizeMode="contain" />
          <Text style={s.driverBadge}>{t("auth.login.driverBadge")}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{t("auth.login.welcomeTitle")}</Text>
          <Text style={s.cardSub}>{t("auth.login.welcomeSub")}</Text>
          <Text style={s.label}>{t("auth.login.emailLabel")}</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder={t("auth.login.emailPlaceholder")} placeholderTextColor="#AEAEAE"
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={[s.label, { marginTop: 12 }]}>{t("auth.login.passwordLabel")}</Text>
          <View style={s.passwordRow}>
            <TextInput
              style={s.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.login.passwordPlaceholder")}
              placeholderTextColor="#AEAEAE"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={s.consentSection}>
            <TouchableOpacity style={s.consentRow} onPress={() => setAgreedTerms(v => !v)} activeOpacity={0.7}>
              <View style={[s.checkbox, agreedTerms && s.checkboxChecked]}>
                {agreedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={s.consentText}>
                {t("auth.login.consentTermsPrefix")}{" "}
                <Text style={s.consentLink} onPress={() => openPolicy(`${POLICY_BASE}/terms-and-conditions.pdf`)}>
                  {t("auth.login.consentTermsLink")}
                </Text>{" "}
                {t("auth.login.consentAnd")}{" "}
                <Text style={s.consentLink} onPress={() => openPolicy(`${POLICY_BASE}/privacy-policy.pdf`)}>
                  {t("auth.login.consentPrivacyLink")}
                </Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.consentRow} onPress={() => setAgreedTDS(v => !v)} activeOpacity={0.7}>
              <View style={[s.checkbox, agreedTDS && s.checkboxChecked]}>
                {agreedTDS && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={s.consentText}>
                {t("auth.login.consentTDSPrefix")}{" "}
                <Text style={s.consentLink} onPress={() => openPolicy(`${POLICY_BASE}/tds-declaration.pdf`)}>
                  {t("auth.login.consentTDSLink")}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btn, (loading || !agreedTerms || !agreedTDS) && s.btnDisabled]}
            onPress={() => {
              if (!agreedTerms || !agreedTDS) {
                Alert.alert(t("auth.login.acceptTermsAlert"));
                return;
              }
              handleLogin();
            }}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t("auth.login.signIn")}</Text>}
          </TouchableOpacity>
        </View>
        <View style={s.registerCard}>
          <Text style={s.registerTitle}>{t("auth.login.newDriverTitle")}</Text>
          <Text style={s.registerSub}>{t("auth.login.newDriverSub")}</Text>
          <View style={s.stepsRow}>
            {t("auth.login.steps").split(",").map((step, i) => (
              <View key={step} style={s.stepItem}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.registerBtn} onPress={() => router.push("/(auth)/driver-signup")}>
            <Text style={s.registerBtnText}>{t("auth.login.registerBtn")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  logoRow: { alignItems: "center", gap: 6, marginBottom: 32 },
  driverBadge: { color: "#FF6B2B", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#EFEFEF", padding: 24, marginBottom: 16 },
  cardTitle: { color: "#111", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  cardSub: { color: "#777", fontSize: 13, marginBottom: 20 },
  label: { color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  input:         { backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#111", fontSize: 14, fontWeight: "600" },
  passwordRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12, marginTop: 0 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, color: "#111", fontSize: 14, fontWeight: "600" },
  eyeBtn:        { padding: 14 },
  btn: { backgroundColor: "#FF6B2B", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  consentSection: { marginTop: 18, gap: 12 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { backgroundColor: "#FF6B2B", borderColor: "#FF6B2B" },
  consentText: { flex: 1, color: "#555", fontSize: 12.5, lineHeight: 18 },
  consentLink: { color: "#FF6B2B", fontWeight: "700" },
  registerCard: { backgroundColor: "#FFF8F5", borderRadius: 20, borderWidth: 1, borderColor: "#FFD9C9", padding: 20, gap: 10 },
  registerTitle: { color: "#111", fontSize: 17, fontWeight: "800" },
  registerSub: { color: "#777", fontSize: 13 },
  stepsRow: { gap: 8, marginBottom: 4 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FF6B2B", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  stepText: { color: "#555", fontSize: 13 },
  registerBtn: { backgroundColor: "#FF6B2B", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  registerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
