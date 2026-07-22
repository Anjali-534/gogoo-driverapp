import React, { useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const CATEGORY_META = [
  { key: "riderNoShow",       icon: "🚫" },
  { key: "noRides",           icon: "📵" },
  { key: "paymentNotReceived",icon: "💸" },
  { key: "walletIssue",       icon: "💳" },
  { key: "accountBlocked",    icon: "🔒" },
  { key: "docVerification",   icon: "📄" },
  { key: "navigationIssue",   icon: "🗺" },
  { key: "emergency",         icon: "🆘" },
];

export default function NewDriverSupportChatScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const CATEGORIES = CATEGORY_META.map(c => ({
    ...c,
    label: t(`support.quickIssues.${c.key}`),
    subject: t(`support.categorySubjects.${c.key}`),
  }));
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert(t("support.selectCategoryTitle"), t("support.selectCategoryMsg"));
      return;
    }
    if (!message.trim()) {
      Alert.alert(t("support.addMessageTitle"), t("support.addMessageMsg"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/gogoo/support/chat/start`, {
        raised_by: "driver",
        subject: selectedCategory.subject,
        first_message: message.trim(),
      });

      const ticketId = res.data.ticket_id;
      router.replace({ pathname: "/(app)/support/chat" as any, params: { ticket_id: ticketId } });
    } catch {
      Alert.alert(t("common.error"), t("support.startChatErrorMsg"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{t("support.newChatTitle")}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>{t("support.whatHelp")}</Text>

          {/* Category grid */}
          <View style={s.grid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={[s.catCard, selectedCategory?.label === cat.label && s.catCardSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={s.catIcon}>{cat.icon}</Text>
                <Text style={[s.catLabel, selectedCategory?.label === cat.label && s.catLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={s.sectionLabel}>{t("support.yourMessage")}</Text>
          <TextInput
            style={s.messageInput}
            placeholder={t("support.messagePlaceholder")}
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={s.submitBtnText}>{t("support.startChatBtn")}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.bgAlt },
  header:            { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  back:              { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  title:             { fontSize: 20, fontWeight: "900", color: COLORS.textPrimary },
  scroll:            { paddingHorizontal: 20 },
  sectionLabel:      { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10, marginTop: 20 },
  grid:              { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  catCard:           { width: "47%", backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: COLORS.borderSubtle, paddingVertical: 16, paddingHorizontal: 12, alignItems: "center", gap: 6 },
  catCardSelected:   { borderColor: COLORS.info, backgroundColor: COLORS.infoTint },
  catIcon:           { fontSize: 26 },
  catLabel:          { fontSize: 13, fontWeight: "600", color: "#374151", textAlign: "center" },
  catLabelSelected:  { color: COLORS.info },
  messageInput:      { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.textPrimary, minHeight: 120, marginBottom: 4 },
  submitBtn:         { backgroundColor: COLORS.info, borderRadius: RADIUS.card, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { backgroundColor: "#93C5FD" },
  submitBtnText:     { color: COLORS.white, fontSize: 16, fontWeight: "800" },
});
