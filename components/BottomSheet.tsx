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
  // When EXPANDED, the caller's own scrollable content (if any) owns
  // vertical drags except right at its own top edge. Wire this ref to
  // that ScrollView's onScroll (contentOffset.y) so the sheet knows
  // whether it's safe to take a downward drag as "collapse" instead of
  // "scroll". Omit it for sheets with no scrollable content inside —
  // the whole card is then draggable in every snap state.
  scrollOffsetRef?: React.MutableRefObject<number>;
}

const BottomSheet = forwardRef<BottomSheetHandle, Props>(
  ({ children, onExpandChange, onSnapChange, scrollOffsetRef }, ref) => {
    const sheetY      = useRef(new Animated.Value(SHEET_OFFSET)).current;
    const panStartRef = useRef(0);
    const currentYRef = useRef(SHEET_OFFSET);
    // Read synchronously inside PanResponder callbacks — those fire outside
    // React's render cycle, so a prop/state value here would lag by a frame.
    const currentSnapRef = useRef<SnapState>("COLLAPSED");

    const snapTo = (target: number, snap: SnapState, velocity = 0) => {
      Animated.spring(sheetY, {
        toValue: target,
        velocity,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
      currentYRef.current = target;
      currentSnapRef.current = snap;
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
      currentSnapRef.current = "COLLAPSED";
      onExpandChange?.(false);
      onSnapChange?.("COLLAPSED");
    };

    useImperativeHandle(ref, () => ({ expand, collapse, reset, hide, show }));

    const pan = useRef(
      PanResponder.create({
        // Never claim on touch-down — a tap on any button in the sheet
        // (call, chat, advance-status, cancel, collapse) must resolve as a
        // press, not get swallowed by the drag gesture.
        onStartShouldSetPanResponder: () => {
          console.log("[SHEET_PAN/tmp] onStartShouldSetPanResponder -> false (always)");
          return false;
        },
        onMoveShouldSetPanResponder: (_, gs) => {
          const verticalEnough = Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5;
          const snap = currentSnapRef.current;
          const offset = scrollOffsetRef?.current ?? 0;
          let claim: boolean;
          let reason: string;
          if (!verticalEnough) {
            claim = false;
            reason = "not vertical enough";
          } else if (snap !== "EXPANDED") {
            claim = true;
            reason = "not expanded -> whole card draggable";
          } else {
            const atTop = offset <= 0;
            claim = atTop && gs.dy > 0;
            reason = `expanded: atTop=${atTop}, draggingDown=${gs.dy > 0}`;
          }
          console.log(
            "[SHEET_PAN/tmp] onMoveShouldSetPanResponder",
            JSON.stringify({ dx: gs.dx, dy: gs.dy, snap, scrollOffset: offset, verticalEnough, claim, reason })
          );
          return claim;
        },
        onPanResponderGrant: () => {
          console.log("[SHEET_PAN/tmp] onPanResponderGrant — gesture claimed, drag starting");
          panStartRef.current = currentYRef.current;
        },
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
      <Animated.View
        {...pan.panHandlers}
        style={[sh.sheet, { height: FULL_HEIGHT, transform: [{ translateY: sheetY }] }]}
        onLayout={e => console.log("[SHEET_PAN/tmp] outer Animated.View layout", JSON.stringify(e.nativeEvent.layout), "FULL_HEIGHT", FULL_HEIGHT)}
      >
        <View style={sh.handleWrap} hitSlop={{ top: 14, bottom: 14, left: 0, right: 0 }}>
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
