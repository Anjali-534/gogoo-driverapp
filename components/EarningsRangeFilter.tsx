import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "@/constants/theme";
import Chip from "./Chip";

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
        style={s.scroll}
        contentContainerStyle={s.row}
      >
        {RANGES.map(r => (
          <Chip key={r.key} label={r.label} active={selected === r.key} onPress={() => onSelect(r.key)} />
        ))}
      </ScrollView>
      {rangeLabel ? <Text style={s.rangeLabel}>{rangeLabel}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  scroll:         { flexGrow: 0, flexShrink: 0 },
  // Chip spacing is marginRight on each chip, NOT `gap` on the horizontal
  // ScrollView — gap is unreliable inside a horizontal ScrollView's
  // contentContainerStyle on this RN/Expo version and was already found +
  // fixed once in this project.
  row:            { alignItems: "center", paddingBottom: 4 },
  rangeLabel:     { color: COLORS.textMuted, fontSize: 12, fontWeight: "600", marginTop: 6, marginBottom: 4 },
});
