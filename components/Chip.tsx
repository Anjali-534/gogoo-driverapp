import React from "react";
import { Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "@/constants/theme";

// Selectable filter pill used in horizontal chip rows (Notifications
// categories, Earnings range, Ledger months). No fixed height and no
// numberOfLines — the pill grows with the label so it never clips at large
// Android font scales. The parent horizontal ScrollView must set
// flexGrow: 0 + flexShrink: 0 (RN's ScrollView defaults to flexShrink: 1,
// which lets a sibling list squash the row).
export default function Chip({
  label, active, onPress, style, textStyle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, style, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.chipText, textStyle, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // marginRight, not `gap` on the ScrollView — see EarningsRangeFilter.
  chip:           { minHeight: 36, justifyContent: "center", borderWidth: 1.5, borderColor: COLORS.borderStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.bgAlt, marginRight: 8 },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: COLORS.white },
});
