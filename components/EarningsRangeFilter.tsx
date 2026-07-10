import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { COLORS, RADIUS } from "@/constants/theme";

export type EarningsRange =
  | "this_week" | "last_week"
  | "this_month" | "last_month"
  | "this_year" | "last_year"
  | "all_time";

const RANGES: { key: EarningsRange; label: string }[] = [
  { key: "this_week",  label: "This Week" },
  { key: "last_week",  label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year",  label: "This Year" },
  { key: "last_year",  label: "Last Year" },
  { key: "all_time",   label: "All Time" },
];

export default function EarningsRangeFilter({
  selected, onSelect, rangeLabel,
}: {
  selected: EarningsRange;
  onSelect: (r: EarningsRange) => void;
  rangeLabel?: string;
}) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[s.chip, selected === r.key && s.chipActive]}
            onPress={() => onSelect(r.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, selected === r.key && s.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {rangeLabel ? <Text style={s.rangeLabel}>{rangeLabel}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  row:            { paddingBottom: 4 },
  // marginRight on each chip, NOT `gap` on the horizontal ScrollView — gap
  // is unreliable inside a horizontal ScrollView's contentContainerStyle on
  // this RN/Expo version and was already found + fixed once in this project.
  chip:           { borderWidth: 1.5, borderColor: COLORS.borderStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.bgAlt, marginRight: 8 },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#FFF" },
  rangeLabel:     { color: COLORS.textMuted, fontSize: 12, fontWeight: "600", marginTop: 6, marginBottom: 4 },
});
