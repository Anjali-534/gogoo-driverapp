import React from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

export default function DriverTermsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{t("profile.terms.title")}</Text>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.meta}>Effective Date: June 1, 2026</Text>
        <Text style={s.meta}>Aggarwal Publicity and Marketing Pvt. Ltd., New Delhi, India</Text>

        <Text style={s.sectionHeader}>AGREEMENT TO TERMS</Text>
        <Text style={s.body}>
          By registering as a bogie driver partner, you agree to these Terms of Service. Continued use of
          the bogie driver app constitutes acceptance. Please read carefully before proceeding.
        </Text>

        <Text style={s.sectionHeader}>DRIVER ELIGIBILITY</Text>
        {["Must be 18 years or older", "Must hold a valid commercial driving license (badge)", "Must own or have authorization to operate the registered vehicle", "Vehicle must pass bogie's inspection criteria", "Must submit all required KYC documents for verification"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.sectionHeader}>COMMISSION AND EARNINGS</Text>
        {["bogie charges 20% commission on each completed trip fare", "Remaining 80% is credited to your ledger balance", "Minimum withdrawal balance: ₹500", "Withdrawals processed within 2-3 working days", "Negative ledger balance must be cleared before any withdrawal"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.sectionHeader}>CODE OF CONDUCT</Text>
        {["Treat all passengers with respect and courtesy", "Do not cancel accepted rides without valid reason", "Maintain vehicle cleanliness at all times", "Follow all traffic laws and road safety regulations", "Do not accept cash from passengers outside the app", "Do not discriminate against any passenger"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.sectionHeader}>ACCOUNT SUSPENSION</Text>
        <Text style={s.body}>bogie may suspend or terminate driver accounts for:</Text>
        {["Repeated trip cancellations or very low acceptance rate", "Sustained low ratings (below 3.5 stars)", "Fraudulent activity or misuse of the platform", "Traffic law violations while on active duty", "Providing false information during registration"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.sectionHeader}>INSURANCE AND LIABILITY</Text>
        {["Drivers are responsible for their own vehicle insurance (third-party at minimum)", "bogie provides supplementary ride protection during active trips", "bogie is not liable for accidents caused by driver negligence", "Accidents must be reported immediately through the app or helpline"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.sectionHeader}>PRIVACY</Text>
        <Text style={s.body}>
          Your personal data is governed by our Privacy Policy. By using the app, you consent to data
          collection and processing as described therein.
        </Text>

        <Text style={s.sectionHeader}>GOVERNING LAW</Text>
        <Text style={s.body}>
          These terms are governed by Indian law. Any disputes shall be resolved in the competent courts
          of New Delhi, India.
        </Text>

        <Text style={s.sectionHeader}>CONTACT</Text>
        {["Email: legal@bogie.in", "Address: New Delhi, Delhi, India"].map(b => (
          <Text key={b} style={s.bullet}>• {b}</Text>
        ))}

        <Text style={s.footer}>
          © 2026 bogie Logistics · Aggarwal Publicity and Marketing Pvt. Ltd.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  back:          { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  title:         { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", flex: 1 },
  scroll:        { paddingHorizontal: 20, paddingTop: 8 },
  meta:          { color: COLORS.textMuted, fontSize: 12, marginBottom: 4, lineHeight: 18 },
  sectionHeader: { fontSize: 13, fontWeight: "700", letterSpacing: 1, color: COLORS.textMuted, textTransform: "uppercase", marginTop: 24, marginBottom: 8 },
  body:          { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 8 },
  bullet:        { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 6, paddingLeft: 4 },
  footer:        { color: COLORS.textMuted, fontSize: 11, textAlign: "center", marginTop: 32, marginBottom: 8, lineHeight: 16 },
});
