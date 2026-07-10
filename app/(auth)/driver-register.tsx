import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
  Switch, Image, StatusBar
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useTranslation } from "react-i18next";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

// Validates a DD-MM-YYYY string and converts it to YYYY-MM-DD for the API.
// No date-picker library in this project — a plain validated text input
// matches the rest of this form's existing pattern instead of adding one.
function parseDDMMYYYY(input: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  if (d > new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export default function DriverRegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tr = (path: string, options?: Record<string, any>): string => t(`auth.register.${path}`, options as any) as string;

  const STEPS = [tr("steps.personal"), tr("steps.vehicle"), tr("steps.documents"), tr("steps.bankTerms")];

  const COMMON_DOCS = [
    { id: "passport_photo",  label: tr("commonDocs.passport_photo.label"),    required: true,  hasNumber: false, hasExpiry: false },
    { id: "aadhaar",         label: tr("commonDocs.aadhaar.label"),           required: true,  hasNumber: true,  hasExpiry: false, numberLabel: tr("commonDocs.aadhaar.numberLabel"),    numberPlaceholder: tr("commonDocs.aadhaar.numberPlaceholder") },
    { id: "pan_card",        label: tr("commonDocs.pan_card.label"),          required: true,  hasNumber: true,  hasExpiry: false, numberLabel: tr("commonDocs.pan_card.numberLabel"),   numberPlaceholder: "ABCDE1234F" },
    { id: "driving_license", label: tr("commonDocs.driving_license.label"),   required: true,  hasNumber: true,  hasExpiry: true,  numberLabel: tr("commonDocs.driving_license.numberLabel"), numberPlaceholder: "DL-1234567890", expiryLabel: tr("commonDocs.driving_license.expiryLabel") },
    { id: "bank_passbook",   label: tr("commonDocs.bank_passbook.label"),     required: true,  hasNumber: true,  hasExpiry: false, numberLabel: tr("commonDocs.bank_passbook.numberLabel"),   numberPlaceholder: "XXXXXXXXXXXXXXXX" },
    { id: "police_clearance", label: tr("commonDocs.police_clearance.label"), required: true, hasNumber: false, hasExpiry: false,
      note: tr("commonDocs.police_clearance.note") },
  ];

  const VEHICLE_DOCS = {
    two_wheeler: [
      { id: "rc",           label: tr("vehicleDocs.two_wheeler.rc.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.two_wheeler.rc.numberLabel"),            numberPlaceholder: "DL01AB1234567",    expiryLabel: tr("vehicleDocs.two_wheeler.rc.expiryLabel") },
      { id: "insurance",    label: tr("vehicleDocs.two_wheeler.insurance.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.two_wheeler.insurance.numberLabel"),  numberPlaceholder: "INS-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.two_wheeler.insurance.expiryLabel") },
      { id: "puc",          label: tr("vehicleDocs.two_wheeler.puc.label"), required: false, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.two_wheeler.puc.numberLabel"),            numberPlaceholder: "PUC-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.two_wheeler.puc.expiryLabel") },
      { id: "vehicle_photo",label: tr("vehicleDocs.two_wheeler.vehicle_photo.label"), required: true,  hasNumber: false, hasExpiry: false },
    ],
    truck_city: [
      { id: "rc",           label: tr("vehicleDocs.truck_city.rc.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_city.rc.numberLabel"),            numberPlaceholder: "DL01AB1234567",    expiryLabel: tr("vehicleDocs.truck_city.rc.expiryLabel") },
      { id: "insurance",    label: tr("vehicleDocs.truck_city.insurance.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_city.insurance.numberLabel"),  numberPlaceholder: "INS-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.truck_city.insurance.expiryLabel") },
      { id: "puc",          label: tr("vehicleDocs.truck_city.puc.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_city.puc.numberLabel"),            numberPlaceholder: "PUC-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.truck_city.puc.expiryLabel") },
      { id: "fitness",      label: tr("vehicleDocs.truck_city.fitness.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_city.fitness.numberLabel"),     numberPlaceholder: "FIT-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.truck_city.fitness.expiryLabel") },
      { id: "permit",       label: tr("vehicleDocs.truck_city.permit.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_city.permit.numberLabel"),         numberPlaceholder: "PERMIT-XXXXXXXX",  expiryLabel: tr("vehicleDocs.truck_city.permit.expiryLabel") },
      { id: "vehicle_photo",      label: tr("vehicleDocs.truck_city.vehicle_photo.label"),   required: true,  hasNumber: false, hasExpiry: false },
      { id: "vehicle_photo_side", label: tr("vehicleDocs.truck_city.vehicle_photo_side.label"),    required: true,  hasNumber: false, hasExpiry: false },
    ],
    truck_outstation: [
      { id: "rc",            label: tr("vehicleDocs.truck_outstation.rc.label"), required: true, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_outstation.rc.numberLabel"),            numberPlaceholder: "DL01AB1234567",   expiryLabel: tr("vehicleDocs.truck_outstation.rc.expiryLabel") },
      { id: "insurance",     label: tr("vehicleDocs.truck_outstation.insurance.label"), required: true, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_outstation.insurance.numberLabel"), numberPlaceholder: "INS-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.truck_outstation.insurance.expiryLabel") },
      { id: "puc",           label: tr("vehicleDocs.truck_outstation.puc.label"), required: true, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_outstation.puc.numberLabel"),           numberPlaceholder: "PUC-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.truck_outstation.puc.expiryLabel") },
      { id: "fitness",       label: tr("vehicleDocs.truck_outstation.fitness.label"), required: true, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_outstation.fitness.numberLabel"),    numberPlaceholder: "FIT-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.truck_outstation.fitness.expiryLabel") },
      { id: "national_permit",label: tr("vehicleDocs.truck_outstation.national_permit.label"), required: true, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.truck_outstation.national_permit.numberLabel"),  numberPlaceholder: "NP-XXXXXXXXXX",   expiryLabel: tr("vehicleDocs.truck_outstation.national_permit.expiryLabel") },
      { id: "vehicle_photo", label: tr("vehicleDocs.truck_outstation.vehicle_photo.label"), required: true, hasNumber: false, hasExpiry: false },
    ],
    packers: [
      { id: "gst_cert",       label: tr("vehicleDocs.packers.gst_cert.label"),  required: true,  hasNumber: true, hasExpiry: false, numberLabel: tr("vehicleDocs.packers.gst_cert.numberLabel"),           numberPlaceholder: "22AAAAA0000A1Z5" },
      { id: "goods_insurance",label: tr("vehicleDocs.packers.goods_insurance.label"), required: false, hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.packers.goods_insurance.numberLabel"), numberPlaceholder: "INS-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.packers.goods_insurance.expiryLabel") },
      { id: "vehicle_photo",  label: tr("vehicleDocs.packers.vehicle_photo.label"),   required: true,  hasNumber: false, hasExpiry: false },
    ],
    ambulance: [
      { id: "rc",           label: tr("vehicleDocs.ambulance.rc.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.ambulance.rc.numberLabel"),            numberPlaceholder: "DL01AB1234567",   expiryLabel: tr("vehicleDocs.ambulance.rc.expiryLabel") },
      { id: "insurance",    label: tr("vehicleDocs.ambulance.insurance.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.ambulance.insurance.numberLabel"), numberPlaceholder: "INS-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.ambulance.insurance.expiryLabel") },
      { id: "emt_cert",     label: tr("vehicleDocs.ambulance.emt_cert.label"), required: true,  hasNumber: true, hasExpiry: true,  numberLabel: tr("vehicleDocs.ambulance.emt_cert.numberLabel"),      numberPlaceholder: "EMT-XXXXXXXXXX",  expiryLabel: tr("vehicleDocs.ambulance.emt_cert.expiryLabel") },
      { id: "vehicle_photo",      label: tr("vehicleDocs.ambulance.vehicle_photo.label"), required: true,  hasNumber: false, hasExpiry: false },
      { id: "vehicle_photo_side", label: tr("vehicleDocs.ambulance.vehicle_photo_side.label"),  required: true,  hasNumber: false, hasExpiry: false },
    ],
  };

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("cab");
  const [vehicleTypeLabel, setVehicleTypeLabel] = useState("");
  const [vehicleTypeSlug, setVehicleTypeSlug] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState(""); // optional, displayed/entered as DD-MM-YYYY
  const [address, setAddress] = useState(""); // optional

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [payload, setPayload] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [teamSize, setTeamSize] = useState("2");
  const [emtCertified, setEmtCertified] = useState(false);
  const [available24x7, setAvailable24x7] = useState(false);

  const [docNumbers, setDocNumbers] = useState<Record<string, string>>({});
  const [docExpiries, setDocExpiries] = useState<Record<string, string>>({});
  const [docImages, setDocImages] = useState<Record<string, { uri: string; name: string; type: string }>>({});

  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedMvag, setAgreedMvag] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("driver_signup_data").then(d => {
      if (d) {
        const data = JSON.parse(d);
        setName(data.name || ""); setEmail(data.email || "");
        setPhone(data.phone || ""); setPassword(data.password || "");
        setCategory(data.category || data.vehicle_category || "cab");
        setVehicleTypeLabel(data.vehicle_type_label || "");
        setVehicleTypeSlug(data.vehicle_type || "");
      }
    });
  }, []);

  const docKey = vehicleTypeSlug.startsWith("truck_city") ? "truck_city"
    : vehicleTypeSlug.startsWith("truck_os") ? "truck_outstation"
    : vehicleTypeSlug.startsWith("ambulance") ? "ambulance"
    : vehicleTypeSlug === "cab_2w" ? "two_wheeler"
    : null;
  const allDocs = [...COMMON_DOCS, ...(docKey ? VEHICLE_DOCS[docKey] || [] : [])];
  const setDocNumber = (id: string, val: string) => setDocNumbers(p => ({ ...p, [id]: val }));
  const setDocExpiry = (id: string, val: string) => setDocExpiries(p => ({ ...p, [id]: val }));

  const pickDocImage = async (docId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(tr("documents.permissionNeeded")); return; }
    Alert.alert(tr("documents.uploadSourceTitle"), tr("documents.uploadSourceMsg"), [
      { text: tr("documents.camera"), onPress: () => launchPicker(docId, true) },
      { text: tr("documents.gallery"), onPress: () => launchPicker(docId, false) },
      { text: tr("documents.cancel"), style: "cancel" },
    ]);
  };

  const launchPicker = async (docId: string, camera: boolean) => {
    try {
      if (camera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert(tr("documents.cameraPermissionNeeded")); return; }
      }
      const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3] as [number, number], quality: 0.8 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const extMatch = /\.(jpe?g|png)$/i.exec(uri);
        const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        const name = asset.fileName || `${docId}.${ext === "jpeg" ? "jpg" : ext}`;
        setDocImages(p => ({ ...p, [docId]: { uri, name, type: mime } }));
      }
    } catch { Alert.alert(tr("documents.pickErrorMsg")); }
  };

  const validateStep = () => {
    if (step === 0 && (!name || !email || !phone || !password)) { Alert.alert(tr("alerts.fillPersonal")); return false; }
    if (step === 0 && dob.trim() && !parseDDMMYYYY(dob)) { Alert.alert(tr("alerts.invalidDobTitle"), tr("alerts.invalidDobMsg")); return false; }
    if (step === 1) {
      if (category !== "packers" && category !== "ambulance" && (!vehicleNumber || !vehicleModel)) { Alert.alert(tr("alerts.fillVehicle")); return false; }
      if (category === "packers" && !gstNumber) { Alert.alert(tr("alerts.gstRequired")); return false; }
    }
    if (step === 2) {
      const missing = allDocs.filter(doc => doc.required && !docImages[doc.id]);
      if (missing.length > 0) { Alert.alert(tr("alerts.missingDocsTitle"), tr("alerts.missingDocsMsg", { list: missing.map(doc => doc.label).join(", ") })); return false; }
    }
    if (step === 3) {
      if (!accountHolder || !accountNumber || !ifscCode || !bankName) { Alert.alert(tr("alerts.fillBank")); return false; }
      if (!agreedTerms) { Alert.alert(tr("alerts.agreeTermsAlert")); return false; }
      if (!agreedMvag) { Alert.alert(tr("alerts.agreeMvagAlert")); return false; }
    }
    return true;
  };

  const next = () => { if (!validateStep()) return; if (step < 3) setStep(step + 1); else handleSubmit(); };

  const DOC_TYPE_MAP = {
    passport_photo: "passport_photo", aadhaar: "aadhaar", pan_card: "pan_card",
    driving_license: "driving_license", bank_passbook: "bank_passbook", rc: "rc",
    insurance: "insurance", puc: "puc", fitness: "fitness", permit: "permit",
    national_permit: "national_permit", gst_cert: "gst_cert", goods_insurance: "goods_insurance",
    emt_cert: "emt_cert", vehicle_photo: "vehicle_photo", vehicle_photo_side: "vehicle_photo_side",
    police_clearance: "police_clearance",
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const savedData = JSON.parse(await AsyncStorage.getItem("driver_signup_data") || "{}");
const signupRes = await axios.post(`${API}/gogoo/driver/signup`, {
  name, email, password, phone,
  vehicle_type: savedData.vehicle_type || "cab_4w",
  vehicle_category: savedData.category || "cab",
  vehicle_number: vehicleNumber, vehicle_model: vehicleModel, vehicle_color: vehicleColor,
  gst_number: gstNumber, bank_account_holder: accountHolder,
  bank_account_number: accountNumber, bank_ifsc: ifscCode, bank_name: bankName, upi_id: upiId,
  referred_by_code: savedData.referred_by_code || undefined,
  mvag_declaration_accepted: agreedMvag,
  date_of_birth: dob.trim() ? parseDDMMYYYY(dob) || undefined : undefined,
  address: address.trim() || undefined,
});
      const driverId = signupRes.data?.driver_id;
      const res = await axios.post(`${API}/auth/login`, { email, password });
      const token = res.data.access_token;
      await AsyncStorage.setItem("driver_token", token);
      await AsyncStorage.setItem("driver_user", JSON.stringify(res.data.user));
      if (driverId) await AsyncStorage.setItem("driver_id", driverId);
      await AsyncStorage.removeItem("pending_referral_code");

      let uploaded = 0, failed = 0;
      if (driverId) {
        for (const [docId, img] of Object.entries(docImages)) {
          const docType = (DOC_TYPE_MAP as Record<string, string>)[docId] || docId;
          const form = new FormData();
          form.append("doc_type", docType);
          if (docNumbers[docId]) form.append("doc_number", docNumbers[docId]);
          if (docExpiries[docId]) form.append("expiry_date", docExpiries[docId]);
          (form as any).append("file", { uri: img.uri, name: img.name, type: img.type });
          try {
            await axios.post(`${API}/gogoo/drivers/${driverId}/documents`, form, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
              timeout: 30000,
            });
            uploaded++;
          } catch { failed++; }
        }
      }
      await AsyncStorage.removeItem("driver_signup_data");
      const summary = failed > 0
        ? tr("alerts.submittedPartial", { uploaded, failed })
        : tr("alerts.submittedFull");
      Alert.alert(tr("alerts.submittedTitle"), summary, [{ text: t("common.ok"), onPress: () => router.replace("/(app)/home") }]);
    } catch (e: any) {
      Alert.alert(tr("alerts.submitErrorTitle"), e?.response?.data?.error || tr("alerts.submitErrorMsg"));
    } finally { setLoading(false); }
  };

  const categoryColors: Record<string, string> = { cab: "#FF6B2B", truck: "#FF6B2B", ambulance: "#EF4444", packers: "#10B981" };
  const accentColor = categoryColors[category] ?? "#FF6B2B";
  const displayVehicleLabel = vehicleTypeSlug ? t(`auth.vehicleSelect.options.${vehicleTypeSlug}`, { defaultValue: vehicleTypeLabel }) : vehicleTypeLabel;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={s.header}>
        {step > 0 && <TouchableOpacity onPress={() => setStep(step - 1)} style={s.backBtn}><Text style={s.backText}>{tr("back")}</Text></TouchableOpacity>}
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{tr("headerTitle")}</Text>
          <Text style={s.headerSub}>{tr("headerSub", { step: step + 1, name: STEPS[step] })}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.progressBar}>
        {STEPS.map((_, i) => <View key={i} style={[s.progressSeg, i <= step && { backgroundColor: accentColor }]} />)}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.content}>

          {step === 0 && <>
            <Text style={s.sectionTitle}>{tr("personal.sectionTitle")}</Text>
            <F label={tr("personal.fullName")} value={name} onChangeText={setName} placeholder={tr("personal.fullNamePh")} />
            <F label={tr("personal.mobile")} value={phone} onChangeText={setPhone} placeholder={tr("personal.mobilePh")} keyboardType="phone-pad" />
            <F label={tr("personal.email")} value={email} onChangeText={setEmail} placeholder={tr("personal.emailPh")} keyboardType="email-address" autoCapitalize="none" />
            <F label={tr("personal.password")} value={password} onChangeText={setPassword} placeholder={tr("personal.passwordPh")} secureTextEntry />
            <F label={tr("personal.dob")} value={dob} onChangeText={setDob} placeholder={tr("personal.dobPh")} keyboardType="numeric" maxLength={10} />
            <F label={tr("personal.address")} value={address} onChangeText={setAddress} placeholder={tr("personal.addressPh")} multiline />
            <View style={s.infoBox}>
              <Text style={s.infoText}>{tr("personal.phoneVerified")}</Text>
              <Text style={s.infoText}>{tr("personal.vehicleInfo", { vehicle: displayVehicleLabel })}</Text>
            </View>
          </>}

          {step === 1 && <>
            <Text style={s.sectionTitle}>{tr("vehicle.sectionTitle")}</Text>
            <Text style={s.sectionNote}>{tr("vehicle.categoryPrefix")} <Text style={{ color: accentColor, fontWeight: "700" }}>{displayVehicleLabel}</Text></Text>
            {category !== "packers" && category !== "ambulance" && <>
              <F label={tr("vehicle.regNumber")} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder={tr("vehicle.regNumberPh")} autoCapitalize="characters" />
              <F label={tr("vehicle.model")} value={vehicleModel} onChangeText={setVehicleModel} placeholder={tr("vehicle.modelPh")} />
              <F label={tr("vehicle.color")} value={vehicleColor} onChangeText={setVehicleColor} placeholder={tr("vehicle.colorPh")} />
            </>}
            {vehicleTypeSlug.startsWith("truck_") && <>
              <F label={tr("vehicle.payload")} value={payload} onChangeText={setPayload} placeholder={tr("vehicle.payloadPh")} keyboardType="decimal-pad" />
              <Text style={s.label}>{tr("vehicle.fuelType")}</Text>
              <View style={s.chipRow}>
                {["Petrol","Diesel","CNG","LPG","Electric"].map(ft => (
                  <TouchableOpacity key={ft} onPress={() => setFuelType(ft)}
                    style={[s.chip, fuelType === ft && { borderColor: accentColor, backgroundColor: `${accentColor}20` }]}>
                    <Text style={[s.chipText, fuelType === ft && { color: accentColor, fontWeight: "700" }]}>{ft}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>}
            {category === "packers" && <>
              <F label={tr("vehicle.gstNumber")} value={gstNumber} onChangeText={setGstNumber} placeholder={tr("vehicle.gstNumberPh")} autoCapitalize="characters" />
              <F label={tr("vehicle.teamSize")} value={teamSize} onChangeText={setTeamSize} placeholder={tr("vehicle.teamSizePh")} keyboardType="numeric" />
            </>}
            {category === "ambulance" && <>
              <F label={tr("vehicle.regNumber")} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder={tr("vehicle.regNumberPh")} autoCapitalize="characters" />
              <F label={tr("vehicle.ambulanceModel")} value={vehicleModel} onChangeText={setVehicleModel} placeholder={tr("vehicle.ambulanceModelPh")} />
              <T label={tr("vehicle.emtCertified")} value={emtCertified} onToggle={setEmtCertified} accentColor={accentColor} />
              <T label={tr("vehicle.available247")} value={available24x7} onToggle={setAvailable24x7} accentColor={accentColor} />
            </>}
          </>}

          {step === 2 && <>
            <Text style={s.sectionTitle}>{tr("documents.sectionTitle")}</Text>
            <Text style={s.sectionNote}>{tr("documents.sectionNote")}</Text>
            {allDocs.map(doc => (
              <View key={doc.id} style={s.docCard}>
                <View style={s.docHeader}>
                  <Text style={s.docTitle}>{doc.label}</Text>
                  {doc.required
                    ? <Text style={s.docRequired}>{tr("documents.required")}</Text>
                    : <Text style={s.docOptional}>{tr("documents.optional")}</Text>}
                </View>
                {(doc as any).note && (
                  <Text style={s.docNote}>{(doc as any).note}</Text>
                )}
                {doc.hasNumber && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={s.label}>{doc.numberLabel?.toUpperCase()}</Text>
                    <TextInput style={s.input} value={docNumbers[doc.id] || ""} onChangeText={val => setDocNumber(doc.id, val)}
                      placeholder={doc.numberPlaceholder} placeholderTextColor="#AEAEAE" autoCapitalize="characters" />
                  </View>
                )}
                {doc.hasExpiry && (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={s.label}>{doc.expiryLabel?.toUpperCase() || tr("documents.expiryDateLabel")}</Text>
                    <TextInput style={s.input} value={docExpiries[doc.id] || ""} onChangeText={val => setDocExpiry(doc.id, val)}
                      placeholder={tr("documents.expiryPh")} placeholderTextColor="#AEAEAE" keyboardType="numeric" />
                  </View>
                )}
                <View style={s.uploadRow}>
                  {docImages[doc.id]
                    ? <Image source={{ uri: docImages[doc.id].uri }} style={s.docThumb} />
                    : <View style={s.docThumbEmpty}><Text style={s.docThumbEmptyIcon}>📄</Text></View>
                  }
                  <View style={s.uploadInfo}>
                    <Text style={[s.uploadStatus, docImages[doc.id] && { color: "#10B981" }]}>
                      {docImages[doc.id] ? tr("documents.uploaded") : tr("documents.notUploaded")}
                    </Text>
                    <TouchableOpacity style={[s.uploadBtn, { borderColor: accentColor }]} onPress={() => pickDocImage(doc.id)}>
                      <Text style={[s.uploadBtnText, { color: accentColor }]}>
                        {docImages[doc.id] ? tr("documents.reupload") : tr("documents.uploadPhoto")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            <View style={s.noteBox}>
              <Text style={s.noteText}>{tr("documents.reviewNote")}</Text>
            </View>
          </>}

          {step === 3 && <>
            <Text style={s.sectionTitle}>{tr("bank.sectionTitle")}</Text>
            <Text style={s.sectionNote}>{tr("bank.sectionNote")}</Text>
            <F label={tr("bank.accountHolder")} value={accountHolder} onChangeText={setAccountHolder} placeholder={tr("bank.accountHolderPh")} />
            <F label={tr("bank.accountNumber")} value={accountNumber} onChangeText={setAccountNumber} placeholder={tr("bank.accountNumberPh")} keyboardType="numeric" />
            <F label={tr("bank.ifsc")} value={ifscCode} onChangeText={setIfscCode} placeholder={tr("bank.ifscPh")} autoCapitalize="characters" />
            <F label={tr("bank.bankName")} value={bankName} onChangeText={setBankName} placeholder={tr("bank.bankNamePh")} />
            <F label={tr("bank.upi")} value={upiId} onChangeText={setUpiId} placeholder={tr("bank.upiPh")} autoCapitalize="none" />
            <View style={s.termsCard}>
              <Text style={s.termsTitle}>{tr("bank.termsTitle")}</Text>
              <ScrollView style={s.termsScroll} nestedScrollEnabled>
                <Text style={s.termsText}>
                  {"1. Valid driving license required for your vehicle type.\n\n2. All vehicle documents must be valid at all times.\n\n3. bogie Logistics charges a 20% platform commission.\n\n4. Earnings transferred weekly to your bank account.\n\n5. Do not cancel more than 10% of accepted bookings.\n\n6. Ratings below 4.0 may result in account suspension.\n\n7. You are an independent contractor, not an employee of bogie Logistics.\n\n8. bogie Logistics is a unit of Aggarwal Publicity & Marketing Pvt. Ltd."}
                </Text>
              </ScrollView>
              <TouchableOpacity style={s.agreeRow} onPress={() => setAgreedTerms(!agreedTerms)}>
                <View style={[s.checkbox, agreedTerms && { backgroundColor: accentColor, borderColor: accentColor }]}>
                  {agreedTerms && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.agreeText}>{tr("bank.agreeTerms")}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.termsCard}>
              <Text style={s.termsTitle}>{tr("bank.mvagTitle")}</Text>
              <Text style={s.termsText}>
                {tr("bank.mvagIntro")}
              </Text>
              <TouchableOpacity style={[s.agreeRow, { marginTop: 12 }]} onPress={() => setAgreedMvag(!agreedMvag)}>
                <View style={[s.checkbox, agreedMvag && { backgroundColor: accentColor, borderColor: accentColor }]}>
                  {agreedMvag && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.agreeText}>
                  {tr("bank.mvagDeclaration")}
                </Text>
              </TouchableOpacity>
            </View>
          </>}

        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.btn, { backgroundColor: accentColor }, loading && s.btnDisabled]} onPress={next} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.btnText}>{step < 3 ? tr("continueTo", { step: STEPS[step + 1] }) : tr("submit")}</Text>
          )}
        </TouchableOpacity>
        <Text style={s.stepIndicator}>{tr("stepIndicator", { step: step + 1 })}</Text>
      </View>
    </SafeAreaView>
  );
}

function F({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor="#AEAEAE" {...props} />
    </View>
  );
}

function T({ label, value, onToggle, accentColor }: { label: string; value: boolean; onToggle: (v: boolean) => void; accentColor: string }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ false: "#E5E5E5", true: `${accentColor}40` }}
        thumbColor={value ? accentColor : "#CCC"} ios_backgroundColor="#E5E5E5" />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 36, paddingBottom: 12 },
  backBtn: { width: 60 },
  backText: { color: "#FF6B2B", fontSize: 14, fontWeight: "600" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#111", fontSize: 16, fontWeight: "700" },
  headerSub: { color: "#999", fontSize: 12, marginTop: 2 },
  progressBar: { flexDirection: "row", paddingHorizontal: 16, gap: 4, marginBottom: 8 },
  progressSeg: { flex: 1, height: 3, backgroundColor: "#EFEFEF", borderRadius: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  sectionTitle: { color: "#111", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  sectionNote: { color: "#777", fontSize: 13, marginBottom: 20 },
  label: { color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  input: { backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#111", fontSize: 14, fontWeight: "600" },
  infoBox: { backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", padding: 14, gap: 4, marginTop: 8 },
  infoText: { color: "#10B981", fontSize: 13, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#EAEAEA", backgroundColor: "#F7F7F7" },
  chipText: { color: "#777", fontSize: 13, fontWeight: "600" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#EFEFEF", paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  toggleLabel: { color: "#333", fontSize: 14, flex: 1 },
  docCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EFEFEF", padding: 16, marginBottom: 14 },
  docHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  docTitle: { color: "#111", fontSize: 15, fontWeight: "700", flex: 1 },
  docNote: { color: "#B45309", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  docRequired: { color: "#EF4444", fontSize: 11, fontWeight: "600", backgroundColor: "#FFECEC", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  docOptional: { color: "#999", fontSize: 11, backgroundColor: "#F2F2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  docThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#F2F2F2" },
  docThumbEmpty: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EAEAEA", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  docThumbEmptyIcon: { fontSize: 28 },
  uploadInfo: { flex: 1, gap: 8 },
  uploadStatus: { color: "#999", fontSize: 12 },
  uploadBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  uploadBtnText: { fontSize: 13, fontWeight: "700" },
  noteBox: { backgroundColor: "#FFF8F5", borderRadius: 12, borderWidth: 1, borderColor: "#FFD9C9", padding: 14, marginTop: 8 },
  noteText: { color: "#FF6B2B", fontSize: 12, lineHeight: 18 },
  termsCard: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EFEFEF", padding: 16, marginTop: 8 },
  termsTitle: { color: "#111", fontWeight: "800", fontSize: 15, marginBottom: 10 },
  termsScroll: { maxHeight: 160, marginBottom: 14 },
  termsText: { color: "#777", fontSize: 12, lineHeight: 20 },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: "#CCC", alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "900" },
  agreeText: { color: "#333", fontSize: 14, flex: 1 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#EFEFEF", backgroundColor: "#FAFAFA" },
  btn: { borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stepIndicator: { color: "#999", fontSize: 12, textAlign: "center", marginTop: 8 },
});