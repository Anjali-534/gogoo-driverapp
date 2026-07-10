import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, View } from "react-native";

const { height: SCREEN_H } = Dimensions.get("window");

const PEEK_HEIGHT  = 290;
const FULL_HEIGHT  = Math.round(SCREEN_H * 0.72);
const SHEET_OFFSET = FULL_HEIGHT - PEEK_HEIGHT; // collapsed (peek) position
const HIDDEN_OFFSET = FULL_HEIGHT;              // fully off-screen — map takes over

export type SnapState = "EXPANDED" | "COLLAPSED" | "HIDDEN";

export interface BottomSheetHandle {
  expand: () => void;
  collapse: () => void;
  reset: () => void;
  hide: () => void;
  show: () => void;
}

interface Props {
  children: React.ReactNode;
  onExpandChange?: (expanded: boolean) => void;
  onSnapChange?: (snap: SnapState) => void;
}

const BottomSheet = forwardRef<BottomSheetHandle, Props>(
  ({ children, onExpandChange, onSnapChange }, ref) => {
    const sheetY      = useRef(new Animated.Value(SHEET_OFFSET)).current;
    const panStartRef = useRef(0);
    const currentYRef = useRef(SHEET_OFFSET);

    const snapTo = (target: number, snap: SnapState, velocity = 0) => {
      Animated.spring(sheetY, {
        toValue: target,
        velocity,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
      currentYRef.current = target;
      onExpandChange?.(snap === "EXPANDED");
      onSnapChange?.(snap);
    };

    const expand   = () => snapTo(0, "EXPANDED");
    const collapse = () => snapTo(SHEET_OFFSET, "COLLAPSED");
    const hide     = () => snapTo(HIDDEN_OFFSET, "HIDDEN");
    const show     = () => collapse();
    const reset = () => {
      sheetY.setValue(SHEET_OFFSET);
      currentYRef.current = SHEET_OFFSET;
      onExpandChange?.(false);
      onSnapChange?.("COLLAPSED");
    };

    useImperativeHandle(ref, () => ({ expand, collapse, reset, hide, show }));

    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 4,
        onPanResponderGrant: () => { panStartRef.current = currentYRef.current; },
        onPanResponderMove: (_, gs) => {
          const next = Math.max(0, Math.min(HIDDEN_OFFSET, panStartRef.current + gs.dy));
          sheetY.setValue(next);
        },
        onPanResponderRelease: (_, gs) => {
          const pos = Math.max(0, Math.min(HIDDEN_OFFSET, panStartRef.current + gs.dy));
          const vy  = gs.vy;
          if (vy < -0.6) { expand(); return; }
          if (vy > 0.6)  { pos < SHEET_OFFSET + (HIDDEN_OFFSET - SHEET_OFFSET) / 2 ? collapse() : hide(); return; }
          // Slow release — snap to nearest of the three points.
          const dExpand   = Math.abs(pos - 0);
          const dCollapse = Math.abs(pos - SHEET_OFFSET);
          const dHidden   = Math.abs(pos - HIDDEN_OFFSET);
          if (dExpand <= dCollapse && dExpand <= dHidden) expand();
          else if (dCollapse <= dHidden) collapse();
          else hide();
        },
      })
    ).current;

    return (
      <Animated.View style={[sh.sheet, { height: FULL_HEIGHT, transform: [{ translateY: sheetY }] }]}>
        <View {...pan.panHandlers} style={sh.handleWrap} hitSlop={{ top: 14, bottom: 14, left: 0, right: 0 }}>
          <View style={sh.handle} />
        </View>
        {children}
      </Animated.View>
    );
  }
);

export default BottomSheet;

const sh = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    elevation: 18, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20,
    overflow: "hidden",
  },
  handleWrap: { paddingTop: 8, paddingBottom: 4, alignItems: "center" },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDD" },
});
