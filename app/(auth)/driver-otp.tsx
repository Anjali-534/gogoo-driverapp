import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

const DEMO_OTP = "123456";

export default function DriverOTPScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [phone, setPhone] = useState("");
  const inputs = useRef([]);

  useEffect(() => {
    AsyncStorage.getItem("driver_signup_data").then(d => {
      if (d) setPhone(JSON.parse(d).phone);
    });
    const timer = setInterval(() => setResendTimer(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (val, idx) => {
    // A pasted or autofilled code arrives as several digits in one box.
    // Spread it across the boxes — from the first box for a full 6-digit
    // code, otherwise from this box — and focus the last one filled. Two
    // characters is just a digit typed over an existing one (handled below).
    const digits = val.replace(/\D/g, "");
    if (digits.length > 2) {
      const start = digits.length >= 6 ? 0 : idx;
      const newOtp = [...otp];
      const spread = digits.slice(0, 6 - start).split("");
      spread.forEach((d, k) => { newOtp[start + k] = d; });
      setOtp(newOtp);
      inputs.current[start + spread.length - 1]?.focus();
      return;
    }

    // Typed over a filled box: keep the new digit, whichever side of the
    // old one the cursor was on.
    const ch = val.length === 2 ? (val[0] === otp[idx] ? val[1] : val[0]) : val;
    const newOtp = [...otp];
    newOtp[idx] = ch;
    setOtp(newOtp);
    if (ch && idx < 5) inputs.current[idx + 1]?.focus();
    if (!ch && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const entered = otp.join("");
    if (entered.length < 6) { Alert.alert(t("auth.otp.enterOtpAlert")); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    if (entered === DEMO_OTP) {
      const data = JSON.parse(await AsyncStorage.getItem("driver_signup_data") || "{}");
      await AsyncStorage.setItem("driver_signup_data", JSON.stringify({ ...data, phone_verified: true }));
      router.replace("/(auth)/driver-vehicle-select");
    } else {
      Alert.alert(t("auth.otp.invalidOtpTitle"), t("auth.otp.invalidOtpMsg"));
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      {/* "padding" on Android too: under edge-to-edge, adjustResize no longer
          shrinks the window, so without it Verify sits under the keyboard. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>{t("auth.otp.back")}</Text>
          </TouchableOpacity>
          <View style={s.iconCircle}>
            <Text style={s.iconEmoji}>📱</Text>
          </View>
          <Text style={s.title}>{t("auth.otp.title")}</Text>
          <Text style={s.subtitle}>
            {t("auth.otp.subtitlePrefix")}{"\n"}
            <Text style={s.phone}>{phone || t("auth.otp.phoneFallback")}</Text>
          </Text>

          <View style={s.otpRow}>
            {otp.map((digit, i) => (
              <TextInput key={i} ref={ref => { if (ref) inputs.current[i] = ref; }}
                style={[s.otpBox, digit && s.otpBoxFilled]}
                value={digit} onChangeText={val => handleChange(val, i)}
                cursorColor="#111" selectionColor="#111"
                // maxLength 6, not 1: a 1 would truncate a pasted/autofilled
                // code before handleChange could spread it. Each box still
                // only ever displays one digit.
                keyboardType="numeric" maxLength={6} textAlign="center"
                // OTP autofill hint, first box only.
                autoComplete={i === 0 ? "one-time-code" : "off"}
                textContentType={i === 0 ? "oneTimeCode" : "none"} />
            ))}
          </View>
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t("auth.otp.verify")}</Text>}
          </TouchableOpacity>
          <View style={s.resendRow}>
            <Text style={s.resendText}>{t("auth.otp.resendText")}</Text>
            {resendTimer > 0
              ? <Text style={s.resendTimer}>{t("auth.otp.resendTimer", { sec: resendTimer })}</Text>
              : <TouchableOpacity onPress={() => setResendTimer(30)}>
                  <Text style={s.resendLink}>{t("auth.otp.resendLink")}</Text>
                </TouchableOpacity>
            }
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36 },
  back: { marginBottom: 32 },
  backText: { color: "#FF6B2B", fontSize: 15, fontWeight: "600" },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF0EC", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24, borderWidth: 1, borderColor: "#FFD9C9" },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: "900", color: "#111", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#777", textAlign: "center", marginTop: 10, lineHeight: 22 },
  phone: { color: "#111", fontWeight: "700" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 32, marginTop: 32 },
  otpBox: { width: 50, height: 58, backgroundColor: "#F7F7F7", borderWidth: 1.5, borderColor: "#EAEAEA", borderRadius: 14, color: "#111", fontSize: 24, fontWeight: "800" },
  otpBoxFilled: { borderColor: "#FF6B2B", backgroundColor: "#FFF0EC" },
  btn: { backgroundColor: "#FF6B2B", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  resendRow: { flexDirection: "row", justifyContent: "center" },
  resendText: { color: "#777", fontSize: 14 },
  resendTimer: { color: "#999", fontSize: 14 },
  resendLink: { color: "#FF6B2B", fontSize: 14, fontWeight: "700" },
});
