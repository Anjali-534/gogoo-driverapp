import React, { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Keyboard, StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { COLORS, RADIUS } from "@/constants/theme";

const OTP_LENGTH = 4; // backend ride_otp is 4 digits (VerifyRideOTP)

type Props = {
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  error: string;
  loading: boolean;
  onVerify: () => void;
  onClose: () => void;
};

// Ride-start OTP entry (driver types the code shown on the rider's screen).
// Shared by the Orders map view and list view so the two can't drift.
//
// Two Android problems this handles, both JS-only:
// - The digits are drawn in boxes over a hidden TextInput. Dismissing the
//   keyboard (back / tap outside) leaves that input focused, and focus() on
//   an already-focused input does nothing — so tapping the boxes again never
//   reopened the keyboard. Tapping now blurs-then-refocuses, and a
//   keyboard-hide listener blurs the input so the next tap starts clean.
// - Edge-to-edge (mandatory on RN 0.81) means adjustResize no longer shrinks
//   the window, so the keyboard drew over this bottom-pinned sheet.
//   KeyboardAvoidingView "padding" on both platforms pads by the actual
//   keyboard overlap (no double padding where the window does resize).
export default function RideOtpSheet({ visible, value, onChange, error, loading, onVerify, onClose }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardUp(false);
      inputRef.current?.blur();
    });
    return () => { show.remove(); hide.remove(); };
  }, [visible]);

  const openKeyboard = () => {
    const input = inputRef.current;
    if (!input) return;
    if (input.isFocused()) {
      input.blur();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      input.focus();
    }
  };

  const close = () => {
    inputRef.current?.blur();
    onClose();
  };

  const complete = value.length === OTP_LENGTH;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      // Focus once the slide-in has finished; focusing mid-animation can
      // fail to raise the keyboard on Android.
      onShow={() => setTimeout(openKeyboard, 150)}
    >
      <KeyboardAvoidingView behavior="padding" style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: 40 + insets.bottom }, keyboardUp && s.sheetKeyboardUp]}>
          <View style={s.handle} />
          <Text style={s.icon}>🔐</Text>
          <Text style={s.title}>{t("orders.otp.title")}</Text>
          <Text style={s.subtitle}>{t("orders.otp.subtitle")}</Text>
          <Pressable onPress={openKeyboard} style={s.boxRow} hitSlop={8}>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <View key={i} style={[s.box, value.length === i && s.boxActive, value.length > i && s.boxFilled]}>
                <Text style={s.boxText}>{value[i] || ""}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            style={s.hiddenInput}
            value={value}
            onChangeText={v => { if (new RegExp(`^\\d{0,${OTP_LENGTH}}$`).test(v)) onChange(v); }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            caretHidden
            showSoftInputOnFocus
          />
          {error ? <Text style={s.error}>{"⚠"} {error}</Text> : null}
          <TouchableOpacity
            style={[s.verifyBtn, !complete && s.verifyBtnDisabled]}
            onPress={onVerify}
            disabled={!complete || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.verifyBtnText}>{t("orders.otp.verify")}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={close}>
            <Text style={s.cancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:           { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  sheet:             { backgroundColor:"#FFF", borderTopLeftRadius:28, borderTopRightRadius:28, padding:28, alignItems:"center" },
  // The bottom padding (40 + insets.bottom) only clears the gesture bar; with
  // the keyboard up it just wastes room the boxes and Verify button need.
  sheetKeyboardUp:   { paddingBottom:16 },
  handle:            { width:40, height:4, backgroundColor:"#E5E7EB", borderRadius:2, marginBottom:24 },
  icon:              { fontSize:48, marginBottom:12 },
  title:             { fontSize:22, fontWeight:"800", color:"#0D0D0D", marginBottom:8 },
  subtitle:          { fontSize:14, color:"#6B7280", textAlign:"center", lineHeight:20, marginBottom:28 },
  boxRow:            { flexDirection:"row", gap:12, marginBottom:8 },
  box:               { width:60, height:60, borderRadius:14, borderWidth:2, borderColor:"#E5E7EB", backgroundColor:"#F8F9FA", alignItems:"center", justifyContent:"center" },
  boxActive:         { borderColor:COLORS.primary, backgroundColor:"#FFF8F5" },
  boxFilled:         { borderColor:COLORS.primary, backgroundColor:"#FFF" },
  boxText:           { fontSize:24, fontWeight:"800", color:"#0D0D0D" },
  hiddenInput:       { position:"absolute", opacity:0, width:1, height:1 },
  error:             { color:COLORS.danger, fontSize:13, fontWeight:"600", marginTop:8, marginBottom:4 },
  verifyBtn:         { backgroundColor:COLORS.primary, borderRadius:RADIUS.card, paddingVertical:18, width:"100%", alignItems:"center", marginTop:20, shadowColor:COLORS.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:12, elevation:6 },
  verifyBtnDisabled: { backgroundColor:"#E5E7EB", shadowOpacity:0, elevation:0 },
  verifyBtnText:     { color:"#FFF", fontSize:16, fontWeight:"700", letterSpacing:0.3 },
  cancelBtn:         { marginTop:12, paddingVertical:12 },
  cancelText:        { color:"#9CA3AF", fontSize:14, fontWeight:"600" },
});
