import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Linking, Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, API_URL } from "@/services/api";
import { getToken } from "@/services/session";
import { COLORS, RADIUS } from "@/constants/theme";
import { useTranslation } from "react-i18next";

// Per-doc-type icon + color badge — no such mapping existed before; covers
// every doc_type key the backend's requiredDocs/docLabels maps can send
// (documents.go), with a generic fallback for anything not listed here.
const DOC_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  passport_photo:        { icon: "camera-outline",            color: COLORS.purpleAlt, bg: "#F5F3FF" },
  aadhaar:                { icon: "card-outline",               color: COLORS.info,      bg: COLORS.infoTint },
  aadhaar_front:          { icon: "card-outline",               color: COLORS.info,      bg: COLORS.infoTint },
  aadhaar_back:           { icon: "card-outline",               color: COLORS.info,      bg: COLORS.infoTint },
  pan_card:               { icon: "document-text-outline",      color: COLORS.primary,   bg: COLORS.primaryTint },
  driving_license:        { icon: "id-card-outline",            color: COLORS.success,   bg: "#ECFDF5" },
  driving_license_front:  { icon: "id-card-outline",            color: COLORS.success,   bg: "#ECFDF5" },
  driving_license_back:   { icon: "id-card-outline",            color: COLORS.success,   bg: "#ECFDF5" },
  bank_passbook:          { icon: "wallet-outline",             color: COLORS.purpleAlt, bg: "#F5F3FF" },
  police_clearance:       { icon: "shield-checkmark-outline",   color: COLORS.danger,    bg: "#FFF1F2" },
  rc:                     { icon: "car-outline",                color: COLORS.info,      bg: COLORS.infoTint },
  rc_front:               { icon: "car-outline",                color: COLORS.info,      bg: COLORS.infoTint },
  rc_back:                { icon: "car-outline",                color: COLORS.info,      bg: COLORS.infoTint },
  insurance:              { icon: "shield-outline",             color: COLORS.warning,   bg: COLORS.warningTint },
  puc:                    { icon: "leaf-outline",                color: COLORS.success,   bg: "#ECFDF5" },
  pollution_cert:         { icon: "leaf-outline",                color: COLORS.success,   bg: "#ECFDF5" },
  fitness:                { icon: "checkmark-done-outline",     color: COLORS.success,   bg: "#ECFDF5" },
  fitness_cert:           { icon: "checkmark-done-outline",     color: COLORS.success,   bg: "#ECFDF5" },
  permit:                 { icon: "clipboard-outline",          color: COLORS.primary,   bg: COLORS.primaryTint },
  national_permit:        { icon: "clipboard-outline",          color: COLORS.primary,   bg: COLORS.primaryTint },
  gst_cert:               { icon: "business-outline",           color: COLORS.info,      bg: COLORS.infoTint },
  emt_cert:                { icon: "medkit-outline",             color: COLORS.danger,    bg: "#FFF1F2" },
  goods_insurance:        { icon: "shield-outline",             color: COLORS.warning,   bg: COLORS.warningTint },
  vehicle_photo:          { icon: "camera-outline",             color: COLORS.purpleAlt, bg: "#F5F3FF" },
  vehicle_photo_front:    { icon: "camera-outline",             color: COLORS.purpleAlt, bg: "#F5F3FF" },
  vehicle_photo_side:     { icon: "camera-outline",             color: COLORS.purpleAlt, bg: "#F5F3FF" },
};
const DOC_ICON_DEFAULT = { icon: "document-outline", color: "#999", bg: "#F2F2F2" };

type DocStatus = "approved" | "rejected" | "pending" | "missing";

interface Doc {
  doc_type:      string;
  label:         string;
  status:        DocStatus;
  required:      boolean;
  uploaded:      boolean;
  mime_type?:    string;
  file_name?:    string;
  file_size?:    number;
  file_url?:     string;
  reject_reason?: string;
}

const STATUS_STYLE: Record<DocStatus, { bg: string; text: string; icon: string }> = {
  approved: { bg: "#E7FBF1", text: COLORS.success, icon: "✓" },
  rejected:  { bg: "#FFECEC", text: COLORS.danger, icon: "✗" },
  pending:   { bg: COLORS.warningTint, text: COLORS.warning, icon: "⏳" },
  missing:   { bg: "#F2F2F2", text: "#999", icon: "📄" },
};

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const STATUS_CONFIG: Record<DocStatus, { bg: string; text: string; label: string; icon: string }> = {
    approved: { ...STATUS_STYLE.approved, label: t("documents.status.approved") },
    rejected: { ...STATUS_STYLE.rejected, label: t("documents.status.rejected") },
    pending:  { ...STATUS_STYLE.pending,  label: t("documents.status.pending") },
    missing:  { ...STATUS_STYLE.missing,  label: t("documents.status.missing") },
  };
  const [docs,      setDocs]      = useState<Doc[]>([]);
  const [driverID,  setDriverID]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [token,     setToken]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const t = await getToken();
      const storedDriverID = await AsyncStorage.getItem("driver_id");
      setToken(t);
      let did = storedDriverID;
      if (!did) {
        const profileRes = await api.get(`/gogoo/driver/profile`);
        did = profileRes.data.driver_id;
        if (did) await AsyncStorage.setItem("driver_id", did);
      }
      setDriverID(did);
      if (did) {
        const docsRes = await api.get(`/gogoo/drivers/${did}/documents`);
        setDocs(docsRes.data.docs || []);
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || t("documents.alerts.loadErrorMsg");
      // A failed fetch must never look like "zero documents required" —
      // loadError drives a distinct retry view instead of falling through
      // to the docs.length===0 empty state.
      setLoadError(msg);
      Alert.alert(t("documents.alerts.loadErrorTitle"), msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleUpload = async (docType: string, docLabel: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert(t("documents.alerts.fileTooLargeTitle"), t("documents.alerts.fileTooLargeMsg")); return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (asset.mimeType && !allowedTypes.includes(asset.mimeType)) {
        Alert.alert(t("documents.alerts.invalidTypeTitle"), t("documents.alerts.invalidTypeMsg")); return;
      }
      setUploading(docType);
      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" } as any);
      await api.post(`/gogoo/drivers/${driverID}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert(t("documents.alerts.uploadedTitle"), t("documents.alerts.uploadedMsg", { label: docLabel }));
      loadData();
    } catch (e: any) {
      Alert.alert(t("documents.alerts.uploadFailedTitle"), e.response?.data?.error || t("documents.alerts.uploadFailedMsg"));
    } finally { setUploading(null); }
  };

  const handleDelete = (docType: string, docLabel: string) => {
    Alert.alert(t("documents.alerts.deleteTitle"), t("documents.alerts.deleteMsg", { label: docLabel }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        try {
          await api.delete(`/gogoo/drivers/${driverID}/documents/${docType}`);
          loadData();
        } catch { Alert.alert(t("documents.alerts.loadErrorTitle"), t("documents.alerts.deleteErrorMsg")); }
      }},
    ]);
  };

  const openFile = (fileURL: string) => Linking.openURL(`${API_URL}${fileURL}`);

  const approved    = docs.filter(d => d.status === "approved").length;
  const total       = docs.length;
  const progressPct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.logoBar}>
        <Image source={require("../../../assets/logo.png")} style={s.logo} resizeMode="contain" />
        <Image source={require("../../../assets/illustrations/task.png")} style={s.taskIllustration} resizeMode="contain" />
      </View>
      <View style={s.header}>
        <Text style={s.title}>{t("documents.title")}</Text>
        <Text style={s.subtitle}>{t("documents.verifiedCount", { approved, total })}</Text>
      </View>

      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={s.progressText}>
          {progressPct === 100 ? t("documents.allVerified") : t("documents.pendingCount", { count: total - approved })}
        </Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.centerText}>{t("documents.loading")}</Text>
        </View>
      ) : loadError ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>⚠️</Text>
          <Text style={s.centerText}>{t("documents.couldntLoad")}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadData}>
            <Text style={s.retryBtnText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : !driverID ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>⚠️</Text>
          <Text style={s.centerText}>{t("documents.completeRegistrationFirst")}</Text>
        </View>
      ) : docs.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.centerText}>{t("documents.noDocsRequired")}</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {docs.map((doc) => {
            const cfg         = STATUS_CONFIG[doc.status] || STATUS_CONFIG.missing;
            const iconCfg     = DOC_ICON[doc.doc_type] || DOC_ICON_DEFAULT;
            const isUploading = uploading === doc.doc_type;
            const isPDF       = doc.mime_type === "application/pdf";

            return (
              <View key={doc.doc_type} style={s.docCard}>
                <View style={s.docHeaderRow}>
                  <View style={[s.docIconBadge, { backgroundColor: iconCfg.bg }]}>
                    <Ionicons name={iconCfg.icon as any} size={20} color={iconCfg.color} />
                  </View>
                  <View style={s.docTitleWrap}>
                    <Text style={s.docTitle}>{doc.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {doc.required && <Text style={s.requiredTag}>{t("documents.required")}</Text>}
                      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[s.statusText, { color: cfg.text }]}>{cfg.icon} {cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {doc.reject_reason && (
                  <View style={s.rejectBox}>
                    <Text style={s.rejectText}>⚠️ {doc.reject_reason}</Text>
                  </View>
                )}

                {doc.doc_type === "police_clearance" && (
                  <View style={s.helperBox}>
                    <Text style={s.helperText}>
                      {t("documents.policeClearanceHelp")}
                    </Text>
                  </View>
                )}

                {doc.uploaded && (
                  <View style={s.fileInfoRow}>
                    <Text style={s.fileIcon}>{isPDF ? "📑" : "🖼️"}</Text>
                    <View style={s.fileDetails}>
                      <Text style={s.fileName} numberOfLines={1}>{doc.file_name}</Text>
                      <Text style={s.fileMeta}>{isPDF ? t("documents.pdf") : t("documents.image")} · {formatBytes(doc.file_size)}</Text>
                    </View>
                    <TouchableOpacity style={s.previewBtn} onPress={() => openFile(doc.file_url!)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <Text style={s.previewBtnText}>{t("documents.view")}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!doc.uploaded && doc.status !== "approved" ? (
                  // Empty state — dashed dropzone, matching the reference.
                  <TouchableOpacity
                    style={[s.dropzone, isUploading && s.uploadBtnDisabled]}
                    onPress={() => handleUpload(doc.doc_type, doc.label)}
                    disabled={!!uploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={26} color={COLORS.primary} />
                        <Text style={s.dropzoneText}>{t("documents.uploadFile")}</Text>
                        <Text style={s.dropzoneNote}>{t("documents.formatNote")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={s.actionsRow}>
                      {doc.status !== "approved" && (
                        <TouchableOpacity
                          style={[s.uploadBtn, isUploading && s.uploadBtnDisabled]}
                          onPress={() => handleUpload(doc.doc_type, doc.label)}
                          disabled={!!uploading}
                        >
                          {isUploading
                            ? <ActivityIndicator color={COLORS.primary} size="small" />
                            : <Text style={s.uploadBtnText}>{t("documents.reupload")}</Text>}
                        </TouchableOpacity>
                      )}
                      {doc.uploaded && doc.status !== "approved" && (
                        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(doc.doc_type, doc.label)}>
                          <Text style={s.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {doc.status !== "approved" && (
                      <Text style={s.formatNote}>{t("documents.formatNote")}</Text>
                    )}
                  </>
                )}
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  logoBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 44, paddingBottom: 4 },
  logo:    { width: 180, height: 64, marginLeft: -38 },
  taskIllustration: { width: 64, height: 56 },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
  progressWrap: { paddingHorizontal: 20, marginBottom: 8 },
  progressBg: { height: 5, backgroundColor: COLORS.borderSubtle, borderRadius: 3, marginBottom: 6, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { color: "#999", fontSize: 12 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.input, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: COLORS.white, fontWeight: "800", fontSize: 14 },
  emptyEmoji: { fontSize: 48 },
  centerText: { color: "#777", fontSize: 15 },
  docCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 16, marginBottom: 12 },
  docHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  docIconBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  docTitleWrap: { flex: 1, gap: 6 },
  docTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.chip },
  statusText: { fontSize: 12, fontWeight: "600" },
  requiredTag: { color: COLORS.danger, fontSize: 11, fontWeight: "600", backgroundColor: "#FFECEC", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  rejectBox: { backgroundColor: "#FFECEC", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#FFD5D5" },
  rejectText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  helperBox: { backgroundColor: COLORS.primaryTint2, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primaryBorder },
  helperText: { color: "#B45309", fontSize: 12, lineHeight: 17 },
  fileInfoRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderRadius: RADIUS.input, padding: 12, marginBottom: 12, gap: 10, borderWidth: 1, borderColor: "#EAEAEA" },
  fileIcon: { fontSize: 24 },
  fileDetails: { flex: 1 },
  fileName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "600" },
  fileMeta: { color: "#999", fontSize: 11, marginTop: 2 },
  previewBtn: { backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.chip, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.primaryBorder },
  previewBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  uploadBtn: { flex: 1, backgroundColor: COLORS.primaryTint, borderRadius: RADIUS.input, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, alignItems: "center" },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  dropzone: { borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.primaryBorder, borderRadius: RADIUS.input, backgroundColor: COLORS.primaryTint2, paddingVertical: 20, alignItems: "center", justifyContent: "center", gap: 4 },
  dropzoneText: { color: COLORS.primary, fontSize: 14, fontWeight: "700", marginTop: 2 },
  dropzoneNote: { color: "#AEAEAE", fontSize: 11 },
  deleteBtn: { width: 44, height: 44, borderRadius: RADIUS.input, backgroundColor: "#FFECEC", borderWidth: 1, borderColor: "#FFD5D5", alignItems: "center", justifyContent: "center" },
  deleteBtnText: { fontSize: 18 },
  formatNote: { color: "#AEAEAE", fontSize: 11, marginTop: 8 },
});
