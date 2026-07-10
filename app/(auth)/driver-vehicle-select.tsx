import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

// ---- New 3-category taxonomy ----
const VEHICLE_SLUGS = {
  cab: ["cab_2w", "cab_3w", "cab_4w", "cab_4w_suv"],
  truck: ["truck_city_tata_ace", "truck_city_14ft", "truck_city_open", "truck_city_container", "truck_os_14ft", "truck_os_20ft", "truck_os_container", "truck_os_trailer"],
  ambulance: ["ambulance_bls", "ambulance_als", "ambulance_transport"],
};
const CATEGORY_ICONS: Record<string, string> = { cab: "🚗", truck: "🚛", ambulance: "🚑" };
const CATEGORY_COLORS: Record<string, string> = { cab: "#3B82F6", truck: "#FF6B2B", ambulance: "#EF4444" };

export default function VehicleSelectScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [subSelected, setSubSelected] = useState<{ label: string; slug: string } | null>(null);

  const VEHICLE_TYPES = (Object.keys(VEHICLE_SLUGS) as Array<keyof typeof VEHICLE_SLUGS>).map(id => ({
    id,
    icon: CATEGORY_ICONS[id],
    title: t(`auth.vehicleSelect.categories.${id}.title`),
    subtitle: t(`auth.vehicleSelect.categories.${id}.subtitle`),
    desc: t(`auth.vehicleSelect.categories.${id}.desc`),
    color: CATEGORY_COLORS[id],
    options: VEHICLE_SLUGS[id].map(slug => ({ label: t(`auth.vehicleSelect.options.${slug}`), slug })),
  }));

  const handleContinue = async () => {
    if (!selected || !subSelected) return;
    const current = JSON.parse(await AsyncStorage.getItem("driver_signup_data") || "{}");
    await AsyncStorage.setItem("driver_signup_data", JSON.stringify({
      ...current,
      category: selected,
      vehicle_type: subSelected.slug,
      vehicle_type_label: subSelected.label,
    }));
    router.push("/(auth)/driver-register");
  };

  const selectedType = VEHICLE_TYPES.find(v => v.id === selected);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>{t("auth.vehicleSelect.back")}</Text></TouchableOpacity>
        <Text style={s.step}>{t("auth.vehicleSelect.step")}</Text>
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{t("auth.vehicleSelect.title")}</Text>
        <Text style={s.subtitle}>{t("auth.vehicleSelect.subtitle")}</Text>
        <View style={s.grid}>
          {VEHICLE_TYPES.map(v => (
            <TouchableOpacity key={v.id} onPress={() => { setSelected(v.id); setSubSelected(null); }}
              style={[s.card, selected === v.id && { borderColor: v.color, backgroundColor: `${v.color}08` }]}>
              <Text style={s.cardIcon}>{v.icon}</Text>
              <Text style={s.cardTitle}>{v.title}</Text>
              <Text style={s.cardSub}>{v.subtitle}</Text>
              <Text style={s.cardDesc}>{v.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedType && (
          <View style={s.subSection}>
            <Text style={s.subTitle}>{t("auth.vehicleSelect.subTitle")}</Text>
            <View style={s.subGrid}>
              {selectedType.options.map(opt => (
                <TouchableOpacity key={opt.slug} onPress={() => setSubSelected(opt)}
                  style={[s.subCard, subSelected?.slug === opt.slug && { borderColor: selectedType.color, backgroundColor: `${selectedType.color}10` }]}>
                  <Text style={[s.subText, subSelected?.slug === opt.slug && { color: selectedType.color, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <TouchableOpacity style={[s.btn, (!selected || !subSelected) && s.btnDisabled]} onPress={handleContinue} disabled={!selected || !subSelected}>
          <Text style={s.btnText}>{t("auth.vehicleSelect.continue")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 36, paddingBottom: 8 },
  back: { color: "#FF6B2B", fontSize: 15, fontWeight: "600" },
  step: { color: "#999", fontSize: 13 },
  scroll: { paddingHorizontal: 20 },
  title: { color: "#111", fontSize: 26, fontWeight: "900", marginTop: 12, marginBottom: 6 },
  subtitle: { color: "#777", fontSize: 14, marginBottom: 24 },
  grid: { gap: 12, marginBottom: 24 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#EFEFEF", padding: 16 },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { color: "#111", fontSize: 16, fontWeight: "800" },
  cardSub: { color: "#777", fontSize: 13, marginTop: 2 },
  cardDesc: { color: "#999", fontSize: 12, marginTop: 4 },
  subSection: { marginBottom: 24 },
  subTitle: { color: "#111", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  subGrid: { gap: 10 },
  subCard: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1.5, borderColor: "#EFEFEF" },
  subText: { color: "#555", fontSize: 14 },
  btn: { backgroundColor: "#FF6B2B", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 32 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
