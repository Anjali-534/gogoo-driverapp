import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useTranslation } from "react-i18next";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

export default function DriverSignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCheck, setReferralCheck] = useState<{ valid: boolean; referrer_name?: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("pending_referral_code").then(c => { if (c) setReferralCode(c); });
  }, []);

  const checkReferralCode = async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) { setReferralCheck(null); return; }
    try {
      const res = await axios.post(`${API}/gogoo/referral/validate`, { code });
      setReferralCheck(res.data);
    } catch { setReferralCheck(null); }
  };

  const handleNext = async () => {
    if (!name || !email || !phone || !password) { Alert.alert(t("auth.signup.alerts.fillAllFields")); return; }
    if (phone.length < 10) { Alert.alert(t("auth.signup.alerts.enterValidPhone")); return; }
    if (password.length < 8) { Alert.alert(t("auth.signup.alerts.passwordMin8")); return; }
    setLoading(true);
    try {
      await AsyncStorage.setItem("driver_signup_data", JSON.stringify({
        name, email, phone, password, referred_by_code: referralCode.trim().toUpperCase(),
      }));
      router.push("/(auth)/driver-otp");
    } catch { Alert.alert(t("auth.signup.alerts.genericErrorTitle"), t("auth.signup.alerts.genericErrorMsg")); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoRow}>
            <Image source={require("../../assets/logo.png")} style={{ height: 70, width: 200 }} resizeMode="contain" />
            <Text style={s.driverBadge}>{t("auth.signup.driverBadge")}</Text>
          </View>
          <Text style={s.title}>{t("auth.signup.title")}</Text>
          <Text style={s.subtitle}>{t("auth.signup.subtitle")}</Text>
          <View style={s.form}>
            {[
              { label: t("auth.signup.fullNameLabel"),  value: name,  onChangeText: setName,  placeholder: t("auth.signup.fullNamePlaceholder") },
              { label: t("auth.signup.emailLabel"),  value: email, onChangeText: setEmail, placeholder: t("auth.signup.emailPlaceholder"), keyboardType: "email-address", autoCapitalize: "none" },
              { label: t("auth.signup.mobileLabel"),  value: phone, onChangeText: setPhone, placeholder: t("auth.signup.mobilePlaceholder"),   keyboardType: "phone-pad" },
            ].map(f => (
              <View key={f.label}>
                <Text style={s.label}>{f.label}</Text>
                <TextInput style={s.input} placeholderTextColor="#AEAEAE" {...(f as any)} />
              </View>
            ))}
            <View>
              <Text style={s.label}>{t("auth.signup.passwordLabel")}</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  placeholderTextColor="#AEAEAE"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text style={s.label}>{t("auth.signup.referralLabel")}</Text>
              <TextInput style={s.input} placeholderTextColor="#AEAEAE" value={referralCode}
                onChangeText={val => { setReferralCode(val); setReferralCheck(null); }}
                onBlur={checkReferralCode}
                placeholder={t("auth.signup.referralPlaceholder")} autoCapitalize="characters" />
              {referralCheck && (
                <Text style={referralCheck.valid ? s.referralOk : s.referralBad}>
                  {referralCheck.valid ? t("auth.signup.referralOk", { name: referralCheck.referrer_name }) : t("auth.signup.referralBad")}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleNext} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t("auth.signup.sendOtp")}</Text>}
          </TouchableOpacity>
          <View style={s.footer}>
            <Text style={s.footerText}>{t("auth.signup.footerText")}</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={s.link}>{t("auth.signup.signInLink")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },
  logoRow: { alignItems: "center", marginBottom: 28, gap: 6 },
  driverBadge: { color: "#FF6B2B", fontSize: 11, fontWeight: "800", letterSpacing: 3 },
  title: { fontSize: 26, fontWeight: "900", color: "#111", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#777", marginBottom: 28 },
  form: { gap: 16, marginBottom: 24 },
  label: { color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  input:         { backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, color: "#111", fontSize: 15, fontWeight: "600" },
  passwordRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 18, paddingVertical: 16, color: "#111", fontSize: 15, fontWeight: "600" },
  eyeBtn:        { padding: 16 },
  referralOk:    { color: "#10B981", fontSize: 12, fontWeight: "600", marginTop: 6 },
  referralBad:   { color: "#F59E0B", fontSize: 12, fontWeight: "600", marginTop: 6 },
  btn: { backgroundColor: "#FF6B2B", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#777", fontSize: 15 },
  link: { color: "#FF6B2B", fontSize: 15, fontWeight: "700" },
});
