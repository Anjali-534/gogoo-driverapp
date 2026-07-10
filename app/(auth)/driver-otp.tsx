import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar } from "react-native";
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
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
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
      <View style={s.container}>
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
              value={digit} onChangeText={val => handleChange(val.slice(-1), i)}
              keyboardType="numeric" maxLength={1} textAlign="center" />
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
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 36 },
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
