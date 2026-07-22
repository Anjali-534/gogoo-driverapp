import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Linking, Image, Modal, TextInput,
} from "react-native";
import BottomSheet, { BottomSheetHandle } from "../../../components/BottomSheet";
import SOSButton from "../../../components/SOSButton";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/services/api";
import { getToken } from "@/services/session";
import { useTranslation } from "react-i18next";
import { trackOTPVerified, trackOTPFailed, trackRideCompleted } from "@/services/analytics";
import { isBatteryTooLow } from "@/services/battery";
import { olaDirections, decodePolyline as olaDecodePolyline, logMapsProvider } from "@/services/olamaps";
import { COLORS, RADIUS } from "@/constants/theme";
import i18n, { getCurrentLanguage, type LanguageCode } from "@/i18n";

const POLL_MS = 4000;
const GPS_MS  = 5000;
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";


// ── Helpers ──────────────────────────────────────────────────────────────────
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, dLat = ((bLat-aLat)*Math.PI)/180, dLng = ((bLng-aLng)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmtDist(km: number) {
  return km < 1
    ? i18n.t("common.distanceM", { m: Math.round(km*1000) })
    : i18n.t("common.distanceKm", { km: km.toFixed(1) });
}

const decodePolyline = olaDecodePolyline;

async function fetchDirectionsRoute(
  origin: { lat: number; lng: number },
  dest:   { lat: number; lng: number }
): Promise<{ coords: { latitude: number; longitude: number }[]; distanceText: string; durationText: string } | null> {
  const olaRoute = await olaDirections(origin.lat, origin.lng, dest.lat, dest.lng);
  if (olaRoute) {
    logMapsProvider("ola", "directions");
    return {
      coords: decodePolyline(olaRoute.polyline),
      distanceText: `${olaRoute.distanceKm.toFixed(1)} km`,
      durationText: `${olaRoute.durationMins} min${olaRoute.durationMins === 1 ? "" : "s"}`,
    };
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&mode=driving&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url); const data = await res.json();
    if (data.status !== "OK" || !data.routes?.length) return null;
    logMapsProvider("google", "directions");
    const route = data.routes[0];
    return { coords: decodePolyline(route.overview_polyline.points), distanceText: route.legs[0].distance.text, durationText: route.legs[0].duration.text };
  } catch { return null; }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "accepted":    return COLORS.success;
    case "arriving":    return COLORS.info;
    case "in_progress": return COLORS.primary;
    default:            return "#888";
  }
}

const SPEECH_LOCALE: Record<LanguageCode, string> = { en: "en-IN", hi: "hi-IN", or: "or-IN" };

function speak(msg: string) {
  try { Speech.speak(msg, { language: SPEECH_LOCALE[getCurrentLanguage()] || "en-IN", rate: 0.9 }); } catch {}
}

// ── Vehicle marker ─────────────────────────────────────────────────────────
function VehicleMarker({ category }: { category?: string }) {
  const isAmb   = category === "ambulance";
  const isTruck = category === "truck";
  const emoji   = isTruck ? "🚛" : isAmb ? "🚑" : "🚗";
  const border  = isAmb ? COLORS.danger : COLORS.primary;
  return (
    <View style={{ width:46, height:46, borderRadius:23, backgroundColor:"#fff", alignItems:"center", justifyContent:"center", borderWidth:2.5, borderColor:border, elevation:6 }}>
      <Text style={{ fontSize:22 }}>{emoji}</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function OrdersScreen() {
  const router            = useRouter();
  const { t }             = useTranslation();
  const authRef           = useRef({ token: "", driverId: "" });
  const pollRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSubRef         = useRef<Location.LocationSubscription | null>(null);
  const myPosRef          = useRef({ lat: 0, lng: 0, heading: 0 });
  const readyRef          = useRef(false);
  const activeBookingRef  = useRef<any>(null);
  const autoCompletingRef = useRef(false);
  const mapRef            = useRef<MapView>(null);
  const otpInputRef       = useRef<TextInput>(null);
  const lastRouteKeyRef   = useRef("");
  const prevVoiceStatusRef = useRef("");
  const spoken500Ref      = useRef(false);
  const spoken100Ref      = useRef(false);
  const isMounted         = useRef(true);

  const [ready,          setReady]          = useState(false);
  const [myLat,          setMyLat]          = useState(0);
  const [myLng,          setMyLng]          = useState(0);
  const [myHeading,      setMyHeading]      = useState(0);
  const [pending,        setPending]        = useState<any[]>([]);
  const [activeBooking,  setActiveBooking]  = useState<any>(null);
  const [loading,        setLoading]        = useState(false);
  const [accepting,      setAccepting]      = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling,     setCancelling]     = useState(false);
  const [view,           setView]           = useState<"list"|"map">("list");
  const [routeCoords,    setRouteCoords]    = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeDistText,  setRouteDistText]  = useState("");
  const [routeDurText,   setRouteDurText]   = useState("");
  const [completedRide,  setCompletedRide]  = useState<{
    fare: number; earnings: number; distanceKm: number; riderName: string;
  } | null>(null);
  const [sheetExpanded,  setSheetExpanded]  = useState(false);
  const [sheetSnap,      setSheetSnap]      = useState<"EXPANDED" | "COLLAPSED" | "HIDDEN">("COLLAPSED");
  const [showOtpModal,   setShowOtpModal]   = useState(false);
  const [otpInput,       setOtpInput]       = useState("");
  const [otpError,       setOtpError]       = useState("");
  const [otpLoading,     setOtpLoading]     = useState(false);

  const sheetRef = useRef<BottomSheetHandle>(null);

  // ── Camera auto-follow driver GPS ──────────────────────────────────────
  useEffect(() => {
    if (!myLat || !mapRef.current || view !== "map") return;
    mapRef.current.animateCamera({
      center: { latitude: myLat, longitude: myLng },
      heading: myHeading,
      zoom: 16,
    }, { duration: 1000 });
  }, [myLat, myLng, view]);

  // ── Voice nav: fire on status change ──────────────────────────────────
  useEffect(() => {
    if (!activeBooking) return;
    const s = activeBooking.status;
    if (s === prevVoiceStatusRef.current) return;
    prevVoiceStatusRef.current = s;
    // Reset proximity flags on each new status
    spoken500Ref.current = false;
    spoken100Ref.current = false;
    if (s === "accepted")    speak(t("orders.voice.accepted"));
    else if (s === "arriving")    speak(t("orders.voice.arriving"));
    else if (s === "in_progress") speak(t("orders.voice.inProgress"));
    else if (s === "completed")   speak(t("orders.voice.completed"));
  }, [activeBooking?.status]);

  // ── Boot: load auth + start GPS + polling ─────────────────────────────
  useEffect(() => {
    (async () => {
      const t = (await getToken()) || "";
      let   d = await AsyncStorage.getItem("driver_id")    || "";

      let restoredBookingId: string | null = null;
      if (t) {
        try {
          const abRes = await api.get(`/gogoo/driver/active-booking`);
          if (abRes.data?.driver_id && !d) {
            d = abRes.data.driver_id;
            await AsyncStorage.setItem("driver_id", d);
          }
          if (abRes.data?.booking_id) {
            restoredBookingId = abRes.data.booking_id;
            const fullRes = await api.get(`/gogoo/bookings/${abRes.data.booking_id}`);
            setActiveBooking(fullRes.data);
            setView("map");
          }
        } catch {}
      }

      authRef.current = { token: t, driverId: d };

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        locSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
          loc => {
            const heading = loc.coords.heading ?? 0;
            myPosRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude, heading };
            setMyLat(loc.coords.latitude);
            setMyLng(loc.coords.longitude);
            setMyHeading(heading);
          }
        );
      }

      if (restoredBookingId) startGpsPush(restoredBookingId);
      setReady(true);
    })();

    return () => {
      isMounted.current = false;
      locSubRef.current?.remove();
      if (pollRef.current) clearInterval(pollRef.current);
      if (gpsRef.current)  clearInterval(gpsRef.current);
    };
  }, []);

  useEffect(() => {
    readyRef.current = ready;
    if (!ready) return;
    startPoll();
    return () => stopPoll();
  }, [ready]);

  useEffect(() => { activeBookingRef.current = activeBooking; }, [activeBooking]);

  useFocusEffect(
    useCallback(() => {
      if (!readyRef.current || activeBookingRef.current) return;
      const { token } = authRef.current;
      if (!token) return;
      (async () => {
        try {
          const abRes = await api.get(`/gogoo/driver/active-booking`);
          if (abRes.data?.booking_id) {
            if (abRes.data?.driver_id) {
              authRef.current.driverId = abRes.data.driver_id;
              await AsyncStorage.setItem("driver_id", abRes.data.driver_id);
            }
            const fullRes = await api.get(`/gogoo/bookings/${abRes.data.booking_id}`);
            setActiveBooking(fullRes.data);
            setView("map");
            startGpsPush(abRes.data.booking_id);
          }
        } catch {}
      })();
    }, [])
  );

  // ── Road route for map view ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeBooking || view !== "map" || !myLat) return;
    const beforePickup = ["accepted","arriving"].includes(activeBooking.status);
    const destLat = beforePickup ? activeBooking.pickup?.lat : activeBooking.drop?.lat;
    const destLng = beforePickup ? activeBooking.pickup?.lng : activeBooking.drop?.lng;
    if (!destLat || !destLng) return;

    const key = `${myLat.toFixed(3)},${myLng.toFixed(3)}-${destLat},${destLng}-${activeBooking.status}`;
    if (key === lastRouteKeyRef.current) return;
    lastRouteKeyRef.current = key;

    fetchDirectionsRoute({ lat: myLat, lng: myLng }, { lat: destLat, lng: destLng }).then(result => {
      if (result) {
        setRouteCoords(result.coords);
        setRouteDistText(result.distanceText);
        setRouteDurText(result.durationText);
      } else {
        setRouteCoords([{ latitude: myLat, longitude: myLng }, { latitude: destLat, longitude: destLng }]);
        setRouteDistText("");
        setRouteDurText("");
      }
    });
  }, [myLat, myLng, activeBooking?.status, view]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPoll = () => {
    stopPoll();
    fetchPending();
    pollRef.current = setInterval(fetchPending, POLL_MS);
  };
  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fetchPending = async () => {
    const { token } = authRef.current;
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get(`/gogoo/bookings-pending`, { timeout: 8000 });
      setPending(res.data?.bookings || []);
    } catch (e: any) {
      // 401s are handled globally by the shared axios interceptor.
      if (e.response?.status === 401) setPending([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Completion trigger ─────────────────────────────────────────────────
  const rideStartTimeRef = useRef<string | null>(null);

  const triggerCompletion = (booking: any) => {
    if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
    autoCompletingRef.current = false;
    const fare = (booking.final_fare ?? booking.estimated_fare) || 0;
    const durationMins = rideStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - new Date(rideStartTimeRef.current).getTime()) / 60000))
      : 0;
    trackRideCompleted({
      bookingId: booking.id || "",
      service: booking.service_type?.category || "cab",
      fare: Math.round(fare),
      distanceKm: Number(booking.distance_km || 0),
      durationMins,
    });
    setCompletedRide({
      fare: Math.round(fare),
      earnings: Math.round(fare * 0.8),
      distanceKm: booking.distance_km || 0,
      riderName: booking.rider_name || t("common.riderFallback"),
    });
    setActiveBooking(null);
    setView("list");
    setRouteCoords([]);
    setRouteDistText("");
    setRouteDurText("");
    lastRouteKeyRef.current = "";
    spoken500Ref.current = false;
    spoken100Ref.current = false;
  };

  // ── GPS push + active booking refresh + auto-complete + voice prox ─────
  const startGpsPush = (bookingId: string) => {
    if (gpsRef.current) clearInterval(gpsRef.current);
    gpsRef.current = setInterval(async () => {
      const { token, driverId } = authRef.current;
      const { lat, lng, heading } = myPosRef.current;
      if (!token || !driverId || !lat) return;
      try {
        await api.post(`/gogoo/drivers/${driverId}/location`, { lat, lng, heading });
        const res = await api.get(`/gogoo/bookings/${bookingId}`);
        setActiveBooking(res.data);

        // Proximity voice alerts
        const bk = res.data;
        if (bk.status === "in_progress" && bk.drop?.lat) {
          const distM = getDistanceMeters(lat, lng, bk.drop.lat, bk.drop.lng);
          if (distM < 600 && distM >= 200 && !spoken500Ref.current) {
            spoken500Ref.current = true;
            speak(t("orders.voice.approachingDrop"));
          } else if (distM < 200 && !spoken100Ref.current) {
            spoken100Ref.current = true;
            speak(t("orders.voice.atDrop"));
          }
        } else if (["accepted","arriving"].includes(bk.status) && bk.pickup?.lat) {
          const distM = getDistanceMeters(lat, lng, bk.pickup.lat, bk.pickup.lng);
          if (distM < 600 && distM >= 200 && !spoken500Ref.current) {
            spoken500Ref.current = true;
            speak(t("orders.voice.approachingPickup"));
          } else if (distM < 200 && !spoken100Ref.current) {
            spoken100Ref.current = true;
            speak(t("orders.voice.atPickup"));
          }
        }

        // Auto-complete when driver is within 100m of the drop point
        if (bk.status === "in_progress" && !autoCompletingRef.current) {
          const dropLat = bk.drop?.lat, dropLng = bk.drop?.lng;
          if (dropLat && dropLng && getDistanceMeters(lat, lng, dropLat, dropLng) < 100) {
            autoCompletingRef.current = true;
            try {
              await api.patch(`/gogoo/bookings/${bookingId}/status`, { status: "completed" });
              const finalRes = await api.get(`/gogoo/bookings/${bookingId}`);
              triggerCompletion(finalRes.data);
              return;
            } catch { autoCompletingRef.current = false; }
          }
        }

        if (["completed","cancelled"].includes(bk.status)) {
          if (bk.status === "completed") {
            triggerCompletion(bk);
          } else {
            clearInterval(gpsRef.current!);
            gpsRef.current = null;
            setActiveBooking(null);
            setView("list");
            setRouteCoords([]);
            setRouteDistText("");
            setRouteDurText("");
            lastRouteKeyRef.current = "";
          }
        }
      } catch {}
    }, GPS_MS);
  };

  // ── Accept ─────────────────────────────────────────────────────────────
  const acceptBooking = async (bookingId: string) => {
    const tooLow = await isBatteryTooLow();
    if (tooLow) {
      Alert.alert(
        t("orders.alerts.batteryTooLowTitle"),
        t("orders.alerts.batteryTooLowMsg"),
        [{ text: t("common.ok") }]
      );
      return;
    }

    setAccepting(bookingId);
    try {
      const acceptRes = await api.post(`/gogoo/bookings/${bookingId}/accept`, {});
      if (acceptRes.data?.driver_id) {
        authRef.current.driverId = acceptRes.data.driver_id;
        await AsyncStorage.setItem("driver_id", acceptRes.data.driver_id);
      }
      const res = await api.get(`/gogoo/bookings/${bookingId}`);
      setActiveBooking(res.data);
      lastRouteKeyRef.current = "";
      setRouteCoords([]);
      setRouteDistText("");
      setRouteDurText("");
      startGpsPush(bookingId);
      setView("map");
      // Reset sheet to peek when entering map
      sheetRef.current?.reset();
    } catch (e: any) {
      Alert.alert(t("orders.alerts.cannotAcceptTitle"), e.response?.data?.error || t("orders.alerts.cannotAcceptMsg"));
    } finally {
      setAccepting(null);
    }
  };

  const rejectBooking = (bookingId: string) => {
    setPending(p => p.filter(b => b.id !== bookingId));
  };

  // ── Update trip status ───────────────────────────────────────────────────
  const updateStatus = async (status: string) => {
    if (!activeBooking) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/gogoo/bookings/${activeBooking?.id}/status`, { status });
      if (status === "completed") {
        try {
          const finalRes = await api.get(`/gogoo/bookings/${activeBooking?.id}`);
          triggerCompletion(finalRes.data);
        } catch { triggerCompletion(activeBooking); }
      } else {
        setActiveBooking((prev: any) => prev ? { ...prev, status } : prev);
      }
    } catch { Alert.alert(t("common.error"), t("orders.alerts.updateStatusError")); }
    finally { if (isMounted.current) setUpdatingStatus(false); }
  };

  const cancelRide = () => {
    if (!activeBooking) return;
    Alert.alert(
      t("orders.alerts.cancelRideTitle"),
      t("orders.alerts.cancelRideMsg"),
      [
        { text: t("orders.alerts.keepRide"), style: "cancel" },
        { text: t("orders.alerts.yesCancel"), style: "destructive", onPress: async () => {
          setCancelling(true);
          try {
            await api.patch(`/gogoo/bookings/${activeBooking?.id}/status`, {
              status: "cancelled", cancelled_by: "driver", cancel_reason: "Cancelled by driver",
            });
            if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
            setActiveBooking(null);
            setView("list");
            setRouteCoords([]);
            setRouteDistText("");
            setRouteDurText("");
            lastRouteKeyRef.current = "";
          } catch { Alert.alert(t("common.error"), t("orders.alerts.cancelRideError")); }
          finally { setCancelling(false); }
        }},
      ]
    );
  };

  const openNav = (lat: number, lng: number) => {
    const url = Platform.OS === "ios"
      ? `maps://?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`));
  };

  const callRider = () => {
    const phone = activeBooking?.rider_phone;
    if (!phone) return;
    Alert.alert(
      t("orders.alerts.callRiderTitle"),
      t("orders.alerts.callRiderMsg", { name: activeBooking?.rider_name || t("orders.alerts.callRiderFallback"), phone }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("orders.alerts.callBtn"), onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  // ── OTP handlers ──────────────────────────────────────────────────────
  const closeOtpModal = () => {
    otpInputRef.current?.blur();
    setShowOtpModal(false);
    setOtpInput("");
    setOtpError("");
    setOtpLoading(false);
  };

  const handleStartRide = () => {
    setOtpInput("");
    setOtpError("");
    setShowOtpModal(true);
    setTimeout(() => { otpInputRef.current?.focus(); }, 400);
  };

  const handleVerifyOtp = async () => {
    if (!activeBooking?.id) { setOtpError(t("orders.otp.errors.bookingNotFound")); return; }
    if (otpInput.length !== 4) { setOtpError(t("orders.otp.errors.enterOtp")); return; }
    setOtpLoading(true);
    try {
      await api.post(`/gogoo/bookings/${activeBooking.id}/verify-otp`, { otp: otpInput });
      otpInputRef.current?.blur();
      setShowOtpModal(false);
      rideStartTimeRef.current = new Date().toISOString();
      trackOTPVerified({ bookingId: activeBooking.id, attempts: 1 });
      if (isMounted.current) {
        setOtpInput("");
        setOtpError("");
        setOtpLoading(false);
        setActiveBooking((prev: any) => prev ? { ...prev, status: "in_progress" } : prev);
      }
    } catch (e: any) {
      trackOTPFailed({ bookingId: activeBooking.id, attempts: 1 });
      if (isMounted.current) {
        setOtpLoading(false);
        setOtpError(e.response?.data?.error || t("orders.otp.errors.invalid"));
      }
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  //  MAP VIEW
  // ════════════════════════════════════════════════════════════════════════
  if (activeBooking && view === "map") {
    const accent      = getStatusColor(activeBooking.status);
    const beforePickup = ["accepted","arriving"].includes(activeBooking.status);
    const tLat = beforePickup ? activeBooking.pickup?.lat : activeBooking.drop?.lat;
    const tLng = beforePickup ? activeBooking.pickup?.lng : activeBooking.drop?.lng;
    const dist = myLat && tLat ? haversineKm(myLat, myLng, tLat, tLng) : null;
    const category = activeBooking.vehicle_category || "cab";

    const nextStatusMap =
      activeBooking.status === "accepted"    ? "arriving"    :
      activeBooking.status === "arriving"    ? "in_progress" :
      activeBooking.status === "in_progress" ? "completed"   : null;
    const nextLabelMap =
      activeBooking.status === "accepted"    ? t("orders.nextAction.arriving")  :
      activeBooking.status === "arriving"    ? t("orders.nextAction.startRide") :
      activeBooking.status === "in_progress" ? t("orders.nextAction.complete")  : null;

    const distLabel = routeDistText
      ? `${routeDistText}${routeDurText ? " · " + routeDurText : ""}`
      : dist !== null ? fmtDist(dist) : null;

    return (
      <View style={s.fill}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          showsCompass
          showsMyLocationButton={false}
          initialRegion={{ latitude:myLat||28.61, longitude:myLng||77.20, latitudeDelta:0.04, longitudeDelta:0.04 }}
        >
          {/* Driver's own vehicle marker */}
          {myLat > 0 && (
            <Marker coordinate={{ latitude:myLat, longitude:myLng }} title={t("orders.map.markerYou")} flat anchor={{x:0.5,y:0.5}}>
              <VehicleMarker category={category} />
            </Marker>
          )}
          {activeBooking?.pickup?.lat && activeBooking?.pickup?.lng && <Marker coordinate={{ latitude:activeBooking.pickup.lat, longitude:activeBooking.pickup.lng }} title={t("orders.map.markerPickup")} pinColor={COLORS.success} />}
          {activeBooking?.drop?.lat   && activeBooking?.drop?.lng   && <Marker coordinate={{ latitude:activeBooking.drop.lat,   longitude:activeBooking.drop.lng   }} title={t("orders.map.markerDrop")}   pinColor={COLORS.primary} />}
          {routeCoords.length >= 2 && (
            <Polyline coordinates={routeCoords} strokeColor={accent} strokeWidth={4} lineDashPattern={beforePickup ? [8,4] : undefined} />
          )}
        </MapView>

        {/* Back button */}
        <TouchableOpacity style={s.mapBack} onPress={() => setView("list")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={s.mapBackTxt}>{t("orders.map.back")}</Text>
        </TouchableOpacity>

        {/* Distance pill */}
        {distLabel ? (
          <View style={[s.distPill, { backgroundColor: accent }]}>
            <Text style={s.distPillTxt}>
              {beforePickup ? t("orders.map.pickupDistPrefix", { dist: distLabel }) : t("orders.map.dropDistPrefix", { dist: distLabel })}
            </Text>
          </View>
        ) : null}

        {/* SOS — always visible above the sheet, independent of its position */}
        <SOSButton
          bookingId={activeBooking?.id}
          fallbackLat={myLat || activeBooking?.pickup?.lat}
          fallbackLng={myLng || activeBooking?.pickup?.lng}
          riderName={activeBooking?.rider_name}
          riderPhone={activeBooking?.rider_phone}
        />

        {/* ── BOTTOM SHEET ─────────────────────────────────── */}
        <BottomSheet ref={sheetRef} onExpandChange={setSheetExpanded} onSnapChange={setSheetSnap}>
          {/* Peek content */}
          <View style={s.peekContent}>
            <View style={s.riderRow}>
              <View style={s.avatar}><Text style={s.avatarTxt}>{(activeBooking.rider_name||"R")[0].toUpperCase()}</Text></View>
              <View style={{ flex:1 }}>
                <Text style={s.riderName}>{activeBooking.rider_name || t("common.riderFallback")}</Text>
                <Text style={s.riderMeta}>{activeBooking.service_name || t("common.bookingFallback")}{distLabel ? `  ·  ${distLabel}` : ""}</Text>
              </View>
              <Text style={s.fareAmt}>{t("common.fareAmount", { amount: Math.round(activeBooking.estimated_fare||0) })}</Text>
            </View>

            <View style={s.routeMini}>
              <View style={s.miniRow}><View style={[s.dot,{backgroundColor:COLORS.success}]} /><Text style={s.miniAddr} numberOfLines={1}>{activeBooking.pickup?.address||t("common.pickupFallback")}</Text></View>
              <View style={s.miniRow}><View style={[s.dot,{backgroundColor:COLORS.primary}]} /><Text style={s.miniAddr} numberOfLines={1}>{activeBooking.drop?.address||t("common.dropFallback")}</Text></View>
            </View>

            <View style={s.mapBtns}>
              {!!tLat && !!tLng && (
                <TouchableOpacity style={s.navBtn} onPress={() => openNav(tLat, tLng)}>
                  <Text style={s.navBtnTxt}>{t("orders.card.navigate")}</Text>
                </TouchableOpacity>
              )}
              {["accepted","arriving","in_progress"].includes(activeBooking.status) && !!activeBooking?.rider_phone && (
                <TouchableOpacity style={s.callRiderBtn} onPress={callRider}>
                  <Text style={s.callRiderTxt}>{t("orders.card.call")}</Text>
                </TouchableOpacity>
              )}
              {["accepted","arriving","in_progress"].includes(activeBooking.status) && (
                <TouchableOpacity
                  style={s.chatBtn}
                  onPress={() => router.push({ pathname:"/(app)/orders/chat", params:{ id: activeBooking.id, riderName: activeBooking.rider_name || t("common.riderFallback"), status: activeBooking.status } } as any)}
                >
                  <Text style={{ fontSize:20 }}>💬</Text>
                  {activeBooking.unread_message_count > 0 ? (
                    <View style={s.chatBadge}><Text style={s.chatBadgeTxt}>{activeBooking.unread_message_count > 9 ? "9+" : activeBooking.unread_message_count}</Text></View>
                  ) : null}
                </TouchableOpacity>
              )}
              {nextStatusMap && (
                <TouchableOpacity
                  style={[s.statusBtn, { backgroundColor: accent }, updatingStatus && s.busyBtn]}
                  onPress={() => nextStatusMap === "in_progress" ? handleStartRide() : updateStatus(nextStatusMap)}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? <ActivityIndicator color="#fff" /> : <Text style={s.statusBtnTxt}>{nextLabelMap}</Text>}
                </TouchableOpacity>
              )}
            </View>

            {activeBooking.status !== "in_progress" && (
              <TouchableOpacity
                style={[s.cancelBtn, cancelling && { opacity:0.6 }]}
                onPress={cancelRide}
                disabled={cancelling || updatingStatus}
              >
                {cancelling ? <ActivityIndicator color={COLORS.danger} size="small" /> : <Text style={s.cancelTxt}>{t("orders.card.cancelRide")}</Text>}
              </TouchableOpacity>
            )}

            {!sheetExpanded && (
              <TouchableOpacity onPress={() => sheetRef.current?.expand()} style={s.expandHint}>
                <Text style={s.expandHintTxt}>{t("orders.sheet.expandHint")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Expanded content */}
          <ScrollView style={s.expandedContent} showsVerticalScrollIndicator={false}>
            <View style={s.routeCard}>
              <Text style={s.routeCardTitle}>{t("orders.sheet.routeTitle")}</Text>
              <View style={s.miniRow}><View style={[s.dot,{backgroundColor:COLORS.success}]} /><Text style={s.routeAddr} numberOfLines={2}>{activeBooking.pickup?.address||t("common.pickupFallback")}</Text></View>
              <View style={s.routeVertLine} />
              <View style={s.miniRow}><View style={[s.dot,{backgroundColor:COLORS.primary}]} /><Text style={s.routeAddr} numberOfLines={2}>{activeBooking.drop?.address||t("common.dropFallback")}</Text></View>
            </View>

            <View style={s.fareBreakdown}>
              <Text style={s.fareBreakTitle}>{t("orders.sheet.fareTitle")}</Text>
              <View style={s.fareBreakRow}><Text style={s.fareBreakLbl}>{t("orders.sheet.estimated")}</Text><Text style={s.fareBreakVal}>{t("common.fareAmount", { amount: Math.round(activeBooking.estimated_fare||0) })}</Text></View>
              <View style={s.fareBreakRow}><Text style={s.fareBreakLbl}>{t("orders.sheet.yourEarnings")}</Text><Text style={[s.fareBreakVal,{color:COLORS.success}]}>{t("common.fareAmount", { amount: Math.round((activeBooking.estimated_fare||0)*0.8) })}</Text></View>
              {activeBooking.distance_km > 0 && <View style={s.fareBreakRow}><Text style={s.fareBreakLbl}>{t("orders.sheet.distance")}</Text><Text style={s.fareBreakVal}>{t("common.distanceKm", { km: Number(activeBooking.distance_km).toFixed(1) })}</Text></View>}
            </View>

            <TouchableOpacity style={s.collapseBtn} onPress={() => sheetRef.current?.collapse()}>
              <Text style={s.collapseBtnTxt}>{t("orders.sheet.collapse")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </BottomSheet>

        {/* Restore pill — shown when the sheet is dragged fully down for a fullscreen map */}
        {sheetSnap === "HIDDEN" && (
          <View style={s.restorePillWrap}>
            <TouchableOpacity style={[s.restorePill, { backgroundColor: accent }]} onPress={() => sheetRef.current?.show()}>
              <Text style={s.restorePillTxt}>{t("orders.restorePill", { name: activeBooking.rider_name || t("orders.restorePillFallback") })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── OTP VERIFICATION MODAL ───────────────────────────── */}
        <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => closeOtpModal()}>
          <View style={s.modalOverlay}>
            <View style={s.otpModal}>
              <View style={s.modalHandle} />
              <Text style={s.otpIcon}>🔐</Text>
              <Text style={s.otpTitle}>{t("orders.otp.title")}</Text>
              <Text style={s.otpSubtitle}>{t("orders.otp.subtitle")}</Text>
              <TouchableOpacity onPress={() => otpInputRef.current?.focus()} activeOpacity={1}>
                <View style={s.otpBoxRow}>
                  {[0,1,2,3].map(i => (
                    <View key={i} style={[s.otpBox, otpInput.length === i && s.otpBoxActive, otpInput.length > i && s.otpBoxFilled]}>
                      <Text style={s.otpBoxText}>{otpInput[i] || ""}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
              <TextInput
                ref={otpInputRef}
                style={s.hiddenInput}
                value={otpInput}
                onChangeText={v => { if (/^\d{0,4}$/.test(v)) { setOtpInput(v); setOtpError(""); } }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus={false}
                caretHidden
                showSoftInputOnFocus
              />
              {otpError ? <Text style={s.otpError}>{"⚠"} {otpError}</Text> : null}
              <TouchableOpacity
                style={[s.otpVerifyBtn, otpInput.length !== 4 && s.otpVerifyBtnDisabled]}
                onPress={handleVerifyOtp}
                disabled={otpInput.length !== 4 || otpLoading}
              >
                {otpLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.otpVerifyBtnText}>{t("orders.otp.verify")}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.otpCancelBtn} onPress={() => closeOtpModal()}>
                <Text style={s.otpCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ════════════════════════════════════════════════════════════════════════
  const accent = activeBooking ? getStatusColor(activeBooking.status) : COLORS.primary;
  const beforePickupList = activeBooking ? ["accepted","arriving"].includes(activeBooking.status) : true;

  const nextStatus =
    activeBooking?.status === "accepted"    ? "arriving"    :
    activeBooking?.status === "arriving"    ? "in_progress" :
    activeBooking?.status === "in_progress" ? "completed"   : null;
  const nextLabel =
    activeBooking?.status === "accepted"    ? t("orders.nextAction.arriving")  :
    activeBooking?.status === "arriving"    ? t("orders.nextAction.startRide") :
    activeBooking?.status === "in_progress" ? t("orders.nextAction.complete")  : null;

  const statusLabel =
    activeBooking?.status === "accepted"    ? t("orders.status.headingToRider") :
    activeBooking?.status === "arriving"    ? t("orders.status.arrivedPickup")  :
    activeBooking?.status === "in_progress" ? t("orders.status.tripInProgress") : "";

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.logoBar}>
        <Image source={require("../../../assets/logo.png")} style={s.logo} resizeMode="contain" />
      </View>
      <View style={s.listHeader}>
        <View>
          <Text style={s.title}>{activeBooking ? t("orders.title.current") : t("orders.title.requests")}</Text>
          <Text style={s.subtitle}>
            {!ready
              ? t("orders.subtitle.loading")
              : activeBooking
                ? t("orders.subtitle.newRequestsWaiting", { count: pending.length })
                : myLat
                  ? t("orders.subtitle.requestsNearYou", { count: pending.length })
                  : t("orders.subtitle.enableLocation")}
          </Text>
        </View>
        {loading && !pending.length && <ActivityIndicator color={COLORS.primary} size="small" />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── CURRENT RIDE CARD (tap anywhere to open map) ──── */}
        {activeBooking && (
          <TouchableOpacity
            style={s.currentSection}
            onPress={() => {
              sheetRef.current?.reset();
              setView("map");
            }}
            activeOpacity={0.97}
          >
            <View style={[s.statusBar, { backgroundColor: accent }]}>
              <View style={s.statusDot} />
              <Text style={s.statusBarTxt}>{statusLabel.toUpperCase()}</Text>
              <Text style={s.statusFare}>{t("common.fareAmount", { amount: Math.round(activeBooking.estimated_fare||0) })}</Text>
            </View>

            <View style={s.currentBody}>
              <View style={s.riderRow}>
                <View style={[s.avatar, { backgroundColor: accent }]}>
                  <Text style={s.avatarTxt}>{(activeBooking.rider_name||"R")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.riderName}>{activeBooking.rider_name || t("common.riderFallback")}</Text>
                  <Text style={s.riderMeta}>{activeBooking.service_name || t("common.bookingFallback")}</Text>
                </View>
                <View style={s.mapChip}><Text style={s.mapChipTxt}>{t("orders.card.mapChip")}</Text></View>
              </View>

              <View style={s.routeBox}>
                <View style={s.miniRow}>
                  <View style={[s.dot,{backgroundColor:COLORS.success}]} />
                  <Text style={s.routeAddr} numberOfLines={2}>{activeBooking.pickup?.address||t("common.pickupFallback")}</Text>
                </View>
                <View style={s.routeLine} />
                <View style={s.miniRow}>
                  <View style={[s.dot,{backgroundColor:COLORS.primary}]} />
                  <Text style={s.routeAddr} numberOfLines={2}>{activeBooking.drop?.address||t("common.dropFallback")}</Text>
                </View>
              </View>

              {myLat > 0 && !!(beforePickupList ? (activeBooking?.pickup?.lat && activeBooking?.pickup?.lng) : (activeBooking?.drop?.lat && activeBooking?.drop?.lng)) && (
                <Text style={[s.currentDist, { color: accent }]}>
                  {beforePickupList
                    ? t("orders.card.toPickup", { dist: fmtDist(haversineKm(myLat,myLng,activeBooking?.pickup?.lat ?? 0,activeBooking?.pickup?.lng ?? 0)) })
                    : t("orders.card.toDrop", { dist: fmtDist(haversineKm(myLat,myLng,activeBooking?.drop?.lat ?? 0,activeBooking?.drop?.lng ?? 0)) })
                  }
                </Text>
              )}

              <View style={s.currentBtns}>
                {!!(beforePickupList ? (activeBooking?.pickup?.lat && activeBooking?.pickup?.lng) : (activeBooking?.drop?.lat && activeBooking?.drop?.lng)) && (
                  <TouchableOpacity style={s.navBtn} onPress={(e) => {
                    e.stopPropagation?.();
                    openNav(
                      beforePickupList ? activeBooking?.pickup?.lat ?? 0 : activeBooking?.drop?.lat ?? 0,
                      beforePickupList ? activeBooking?.pickup?.lng ?? 0 : activeBooking?.drop?.lng ?? 0,
                    );
                  }}>
                    <Text style={s.navBtnTxt}>{t("orders.card.navigate")}</Text>
                  </TouchableOpacity>
                )}
                {["accepted","arriving","in_progress"].includes(activeBooking?.status) && !!activeBooking?.rider_phone && (
                  <TouchableOpacity style={s.callRiderBtn} onPress={(e) => { e.stopPropagation?.(); callRider(); }}>
                    <Text style={s.callRiderTxt}>{t("orders.card.call")}</Text>
                  </TouchableOpacity>
                )}
                {["accepted","arriving","in_progress"].includes(activeBooking?.status) && (
                  <TouchableOpacity
                    style={s.chatBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.push({ pathname:"/(app)/orders/chat", params:{ id: activeBooking.id, riderName: activeBooking.rider_name || t("common.riderFallback"), status: activeBooking.status } } as any);
                    }}
                  >
                    <Text style={{ fontSize:20 }}>💬</Text>
                    {activeBooking.unread_message_count > 0 ? (
                      <View style={s.chatBadge}><Text style={s.chatBadgeTxt}>{activeBooking.unread_message_count > 9 ? "9+" : activeBooking.unread_message_count}</Text></View>
                    ) : null}
                  </TouchableOpacity>
                )}
                {nextStatus && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: accent }, updatingStatus && s.busyBtn]}
                    onPress={(e) => { e.stopPropagation?.(); nextStatus === "in_progress" ? handleStartRide() : updateStatus(nextStatus); }}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnTxt}>{nextLabel}</Text>}
                  </TouchableOpacity>
                )}
              </View>

              {activeBooking.status !== "in_progress" && (
                <TouchableOpacity
                  style={[s.cancelBtn, cancelling && { opacity:0.6 }]}
                  onPress={(e) => { e.stopPropagation?.(); cancelRide(); }}
                  disabled={cancelling || updatingStatus}
                >
                  {cancelling ? <ActivityIndicator color={COLORS.danger} size="small" /> : <Text style={s.cancelTxt}>{t("orders.card.cancelRide")}</Text>}
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* ── PENDING REQUESTS ────────────────────────────────── */}
        <View style={[s.pendingSection, activeBooking && { marginTop: 12 }]}>
          {activeBooking && (
            <View style={s.pendingHeader}>
              <Text style={s.pendingTitle}>{t("orders.pending.title")}</Text>
              {pending.length > 0 && (
                <View style={s.pendingBadge}><Text style={s.pendingBadgeTxt}>{pending.length}</Text></View>
              )}
            </View>
          )}

          {!ready || (loading && !pending.length) ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={s.emptyTitle}>{t("orders.empty.looking")}</Text>
            </View>
          ) : pending.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>{activeBooking ? "👀" : "🕐"}</Text>
              <Text style={s.emptyTitle}>{activeBooking ? t("orders.empty.noRequestsActive") : t("orders.empty.noRequestsIdle")}</Text>
              <Text style={s.emptySub}>{activeBooking ? t("orders.empty.subActive") : t("orders.empty.subIdle")}</Text>
            </View>
          ) : (
            pending.map(order => {
              const dist = myLat > 0 && order.pickup?.lat ? haversineKm(myLat, myLng, order.pickup.lat, order.pickup.lng) : null;
              return (
                <View key={order.id} style={[s.orderCard, !!activeBooking && s.orderCardLocked]}>
                  <View style={s.orderTop}>
                    <View style={s.serviceBadge}><Text style={s.serviceText}>{order.service_name||t("common.bookingFallback")}</Text></View>
                    <Text style={s.orderFare}>{t("common.fareAmount", { amount: Math.round(order.estimated_fare||0) })}</Text>
                  </View>
                  {dist !== null && <Text style={s.orderDist}>{t("orders.card.distanceFromYou", { dist: fmtDist(dist) })}</Text>}
                  <View style={s.orderRoute}>
                    <View style={s.miniRow}><View style={[s.dot,{backgroundColor:COLORS.success}]} /><Text style={s.orderAddr} numberOfLines={2}>{order.pickup?.address||t("common.pickupFallback")}</Text></View>
                    <View style={[s.miniRow,{marginTop:8}]}><View style={[s.dot,{backgroundColor:COLORS.primary}]} /><Text style={s.orderAddr} numberOfLines={2}>{order.drop?.address||t("common.dropFallback")}</Text></View>
                  </View>
                  <Text style={s.orderMeta}>
                    {order.distance_km ? t("orders.card.tripDistance", { km: Number(order.distance_km).toFixed(1) }) : ""}{order.rider_name ? `  ·  ${order.rider_name}` : ""}
                  </Text>

                  {activeBooking ? (
                    <View style={s.lockedBar}><Text style={s.lockedTxt}>{t("orders.card.lockedNotice")}</Text></View>
                  ) : (
                    <View style={s.orderBtns}>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => rejectBooking(order.id)}>
                        <Text style={s.rejectBtnTxt}>{t("orders.card.reject")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.acceptBtn, accepting===order.id && s.acceptBtnBusy]}
                        onPress={() => acceptBooking(order.id)}
                        disabled={!!accepting}
                      >
                        {accepting===order.id ? <ActivityIndicator color="#fff" /> : <Text style={s.acceptBtnTxt}>{t("orders.card.accept")}</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── OTP VERIFICATION MODAL ────────────────────────────── */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => closeOtpModal()}>
        <View style={s.modalOverlay}>
          <View style={s.otpModal}>
            <View style={s.modalHandle} />
            <Text style={s.otpIcon}>🔐</Text>
            <Text style={s.otpTitle}>{t("orders.otp.title")}</Text>
            <Text style={s.otpSubtitle}>{t("orders.otp.subtitle")}</Text>
            <View style={s.otpBoxRow}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.otpBox, otpInput.length === i && s.otpBoxActive, otpInput.length > i && s.otpBoxFilled]}>
                  <Text style={s.otpBoxText}>{otpInput[i] || ""}</Text>
                </View>
              ))}
            </View>
            <TextInput
              style={s.hiddenInput}
              value={otpInput}
              onChangeText={v => { if (/^\d{0,4}$/.test(v)) { setOtpInput(v); setOtpError(""); } }}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            {otpError ? <Text style={s.otpError}>{"⚠"} {otpError}</Text> : null}
            <TouchableOpacity
              style={[s.otpVerifyBtn, otpInput.length !== 4 && s.otpVerifyBtnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpInput.length !== 4 || otpLoading}
            >
              {otpLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.otpVerifyBtnText}>{t("orders.otp.verify")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.otpCancelBtn} onPress={() => closeOtpModal()}>
              <Text style={s.otpCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── TRIP COMPLETION MODAL ──────────────────────────────── */}
      <Modal visible={!!completedRide} transparent animationType="fade">
        <View style={s.completionOverlay}>
          <View style={s.completionCard}>
            <Text style={s.completionEmoji}>🎉</Text>
            <Text style={s.completionTitle}>{t("orders.completion.title")}</Text>
            <Text style={s.completionSub}>{t("orders.completion.sub", { name: completedRide?.riderName || t("common.riderFallback") })}</Text>
            <View style={s.completionStats}>
              <View style={s.completionStat}>
                <Text style={s.completionStatValue}>{t("common.fareAmount", { amount: completedRide?.fare ?? 0 })}</Text>
                <Text style={s.completionStatLabel}>{t("orders.completion.totalFare")}</Text>
              </View>
              <View style={s.completionDivider} />
              <View style={s.completionStat}>
                <Text style={[s.completionStatValue,{color:COLORS.success}]}>{t("common.fareAmount", { amount: completedRide?.earnings ?? 0 })}</Text>
                <Text style={s.completionStatLabel}>{t("orders.completion.yourEarnings")}</Text>
              </View>
              <View style={s.completionDivider} />
              <View style={s.completionStat}>
                <Text style={s.completionStatValue}>{t("common.distanceKm", { km: completedRide?.distanceKm ? Number(completedRide.distanceKm).toFixed(1) : "0" })}</Text>
                <Text style={s.completionStatLabel}>{t("orders.completion.distance")}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.completionDoneBtn} onPress={() => setCompletedRide(null)}>
              <Text style={s.completionDoneTxt}>{t("orders.completion.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  fill:       { flex:1, backgroundColor:"#fff" },
  safe:       { flex:1, backgroundColor:"#FAFAFA" },
  logoBar:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:20, paddingTop:44, paddingBottom:4 },
  logo:       { width:180, height:64, marginLeft:-38 },
  dot:        { width:8, height:8, borderRadius:4, flexShrink:0 },
  miniRow:    { flexDirection:"row", alignItems:"flex-start", gap:10 },
  miniAddr:   { flex:1, color:"#444", fontSize:12 },
  busyBtn:    { opacity:0.6 },

  listHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", paddingHorizontal:20, paddingTop:16, paddingBottom:16 },
  title:      { color:"#111", fontSize:22, fontWeight:"800" },
  subtitle:   { color:"#777", fontSize:12, marginTop:2 },

  // ── Current ride ─────────────────────────────────────────────────────────
  currentSection: { marginHorizontal:20, borderRadius:20, overflow:"hidden", borderWidth:1.5, borderColor:"#E5E7EB", backgroundColor:"#fff", elevation:3 },
  statusBar:      { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:10, gap:8 },
  statusDot:      { width:8, height:8, borderRadius:4, backgroundColor:"rgba(255,255,255,0.8)" },
  statusBarTxt:   { flex:1, color:"#fff", fontWeight:"800", fontSize:12, letterSpacing:0.5 },
  statusFare:     { color:"#fff", fontWeight:"900", fontSize:20 },
  currentBody:    { padding:16, gap:14 },

  riderRow:   { flexDirection:"row", alignItems:"center", gap:12 },
  avatar:     { width:44, height:44, borderRadius:22, alignItems:"center", justifyContent:"center", backgroundColor:COLORS.primary },
  avatarTxt:  { color:"#fff", fontWeight:"800", fontSize:18 },
  riderName:  { color:"#111", fontWeight:"700", fontSize:15 },
  riderMeta:  { color:"#777", fontSize:12, marginTop:2 },
  mapChip:    { backgroundColor:"#F0F4FF", borderRadius:10, paddingHorizontal:12, paddingVertical:7, borderWidth:1, borderColor:"#DBEAFE" },
  mapChipTxt: { color:COLORS.info, fontWeight:"700", fontSize:12 },

  routeBox:   { backgroundColor:"#F9FAFB", borderRadius:14, padding:14, gap:10 },
  routeAddr:  { flex:1, color:"#333", fontSize:13 },
  routeLine:  { width:1, height:12, backgroundColor:"#D1D5DB", marginLeft:3.5 },

  currentDist:  { fontWeight:"700", fontSize:13 },
  currentBtns:  { flexDirection:"row", gap:10 },
  actionBtn:    { flex:2, borderRadius:14, paddingVertical:14, alignItems:"center" },
  actionBtnTxt: { color:"#fff", fontWeight:"800", fontSize:14 },

  // ── Pending section ─────────────────────────────────────────────────────
  pendingSection: { paddingHorizontal:20 },
  pendingHeader:  { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10, marginTop:4 },
  pendingTitle:   { color:"#444", fontWeight:"700", fontSize:13, letterSpacing:0.3 },
  pendingBadge:   { backgroundColor:COLORS.primary, borderRadius:10, paddingHorizontal:7, paddingVertical:2 },
  pendingBadgeTxt:{ color:"#fff", fontWeight:"800", fontSize:11 },

  emptyState: { paddingTop:40, alignItems:"center", gap:12 },
  emptyIcon:  { fontSize:36 },
  emptyTitle: { color:"#333", fontWeight:"700", fontSize:15 },
  emptySub:   { color:"#999", fontSize:12, textAlign:"center", paddingHorizontal:20 },

  orderCard:       { backgroundColor:"#fff", borderRadius:RADIUS.card, borderWidth:1, borderColor:"#EFEFEF", padding:16, marginBottom:12, gap:10, elevation:2 },
  orderCardLocked: { borderColor:"#E5E7EB", opacity:0.85 },
  orderTop:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  serviceBadge:{ backgroundColor:"#F0F4FF", borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  serviceText: { color:COLORS.info, fontWeight:"700", fontSize:11 },
  orderFare:   { color:"#111", fontWeight:"900", fontSize:22 },
  orderDist:   { color:COLORS.primary, fontWeight:"700", fontSize:13 },
  orderRoute:  { paddingVertical:8, borderTopWidth:1, borderTopColor:"#F5F5F5", gap:0 },
  orderAddr:   { flex:1, color:"#333", fontSize:13 },
  orderMeta:   { color:"#999", fontSize:11 },
  orderBtns:   { flexDirection:"row", gap:10, marginTop:4 },
  rejectBtn:   { flex:1, backgroundColor:"#FFF5F5", borderRadius:RADIUS.input, paddingVertical:13, alignItems:"center", borderWidth:1, borderColor:"#FECACA" },
  rejectBtnTxt:{ color:COLORS.danger, fontWeight:"700", fontSize:14 },
  acceptBtn:   { flex:2, backgroundColor:COLORS.primary, borderRadius:RADIUS.input, paddingVertical:13, alignItems:"center" },
  acceptBtnBusy:{ opacity:0.6 },
  acceptBtnTxt:{ color:"#fff", fontWeight:"800", fontSize:14 },

  lockedBar:  { backgroundColor:"#F3F4F6", borderRadius:RADIUS.input, paddingVertical:12, alignItems:"center", borderWidth:1, borderColor:"#E5E7EB", marginTop:4 },
  lockedTxt:  { color:"#9CA3AF", fontWeight:"700", fontSize:13 },

  // ── Map view ──────────────────────────────────────────────────────────────
  mapBack:    { position:"absolute", top:Platform.OS==="ios"?56:40, left:16, backgroundColor:"#fff", borderRadius:RADIUS.input, paddingHorizontal:14, paddingVertical:10, elevation:4 },
  mapBackTxt: { color:"#111", fontWeight:"700", fontSize:14 },
  distPill:   { position:"absolute", top:Platform.OS==="ios"?56:40, alignSelf:"center", paddingHorizontal:16, paddingVertical:8, borderRadius:20, elevation:4 },
  distPillTxt:{ color:"#fff", fontWeight:"800", fontSize:13 },

  restorePillWrap: { position:"absolute", bottom:40, left:0, right:0, alignItems:"center" },
  restorePill:      { paddingHorizontal:20, paddingVertical:12, borderRadius:24, elevation:10, shadowColor:"#000", shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8 },
  restorePillTxt:   { color:"#fff", fontWeight:"700", fontSize:14 },

  peekContent:  { paddingHorizontal:20, paddingTop:20, paddingBottom:8, gap:12 },
  expandedContent:{ flex:1, paddingHorizontal:20 },

  fareAmt:    { color:"#111", fontWeight:"900", fontSize:22 },
  routeMini:  { gap:8, paddingVertical:10, borderTopWidth:1, borderBottomWidth:1, borderColor:"#EFEFEF" },
  mapBtns:    { flexDirection:"row", gap:10 },
  navBtn:     { flex:1, backgroundColor:"#F0F4FF", borderRadius:14, paddingVertical:14, alignItems:"center", borderWidth:1, borderColor:"#DBEAFE" },
  navBtnTxt:  { color:COLORS.info, fontWeight:"800", fontSize:14 },
  statusBtn:  { flex:2, borderRadius:14, paddingVertical:14, alignItems:"center" },
  statusBtnTxt:{ color:"#fff", fontWeight:"800", fontSize:14 },
  cancelBtn:  { marginTop:4, borderWidth:1.5, borderColor:COLORS.danger, borderRadius:14, paddingVertical:13, alignItems:"center" },
  cancelTxt:  { color:COLORS.danger, fontWeight:"700", fontSize:14 },
  callRiderBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, backgroundColor:"#22C55E", borderRadius:14, paddingVertical:14, paddingHorizontal:16 },
  callRiderTxt: { color:"#fff", fontWeight:"800", fontSize:14 },
  chatBtn:      { width:44, height:44, borderRadius:14, backgroundColor:COLORS.info, alignItems:"center", justifyContent:"center" },
  chatBadge:    { position:"absolute", top:-4, right:-4, minWidth:18, height:18, borderRadius:9, backgroundColor:COLORS.danger, alignItems:"center", justifyContent:"center", paddingHorizontal:3, borderWidth:1.5, borderColor:"#fff" },
  chatBadgeTxt: { color:"#fff", fontSize:10, fontWeight:"800" },

  expandHint:     { alignItems:"center", paddingVertical:8 },
  expandHintTxt:  { color:"#BBB", fontSize:12, fontWeight:"600" },
  collapseBtn:    { alignItems:"center", paddingVertical:12, marginTop:4 },
  collapseBtnTxt: { color:"#BBB", fontSize:12, fontWeight:"600" },

  routeCard:      { backgroundColor:"#F9FAFB", borderRadius:RADIUS.card, padding:16, marginBottom:12, gap:8 },
  routeCardTitle: { color:"#111", fontWeight:"700", fontSize:14, marginBottom:4 },
  routeVertLine:  { width:1, height:14, backgroundColor:"#DDD", marginLeft:4, marginVertical:2 },

  fareBreakdown:  { backgroundColor:"#F9FAFB", borderRadius:RADIUS.card, padding:16, marginBottom:16, gap:8 },
  fareBreakTitle: { color:"#111", fontWeight:"700", fontSize:14, marginBottom:2 },
  fareBreakRow:   { flexDirection:"row", justifyContent:"space-between" },
  fareBreakLbl:   { color:"#777", fontSize:13 },
  fareBreakVal:   { color:"#111", fontSize:13, fontWeight:"700" },

  // ── OTP modal ─────────────────────────────────────────────────────────────
  modalOverlay:       { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  otpModal:           { backgroundColor:"#FFF", borderTopLeftRadius:28, borderTopRightRadius:28, padding:28, paddingBottom:40, alignItems:"center" },
  modalHandle:        { width:40, height:4, backgroundColor:"#E5E7EB", borderRadius:2, marginBottom:24 },
  otpIcon:            { fontSize:48, marginBottom:12 },
  otpTitle:           { fontSize:22, fontWeight:"800", color:"#0D0D0D", marginBottom:8 },
  otpSubtitle:        { fontSize:14, color:"#6B7280", textAlign:"center", lineHeight:20, marginBottom:28 },
  otpBoxRow:          { flexDirection:"row", gap:12, marginBottom:8 },
  otpBox:             { width:60, height:60, borderRadius:14, borderWidth:2, borderColor:"#E5E7EB", backgroundColor:"#F8F9FA", alignItems:"center", justifyContent:"center" },
  otpBoxActive:       { borderColor:COLORS.primary, backgroundColor:"#FFF8F5" },
  otpBoxFilled:       { borderColor:COLORS.primary, backgroundColor:"#FFF" },
  otpBoxText:         { fontSize:24, fontWeight:"800", color:"#0D0D0D" },
  hiddenInput:        { position:"absolute", opacity:0, width:1, height:1 },
  otpError:           { color:COLORS.danger, fontSize:13, fontWeight:"600", marginTop:8, marginBottom:4 },
  otpVerifyBtn:       { backgroundColor:COLORS.primary, borderRadius:RADIUS.card, paddingVertical:18, width:"100%", alignItems:"center", marginTop:20, shadowColor:COLORS.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:12, elevation:6 },
  otpVerifyBtnDisabled:{ backgroundColor:"#E5E7EB", shadowOpacity:0, elevation:0 },
  otpVerifyBtnText:   { color:"#FFF", fontSize:16, fontWeight:"700", letterSpacing:0.3 },
  otpCancelBtn:       { marginTop:12, paddingVertical:12 },
  otpCancelText:      { color:"#9CA3AF", fontSize:14, fontWeight:"600" },

  // ── Completion modal ─────────────────────────────────────────────────────
  completionOverlay:  { flex:1, backgroundColor:"rgba(0,0,0,0.55)", alignItems:"center", justifyContent:"center", padding:24 },
  completionCard:     { backgroundColor:"#fff", borderRadius:28, padding:28, width:"100%", alignItems:"center", gap:8, elevation:16 },
  completionEmoji:    { fontSize:52, marginBottom:4 },
  completionTitle:    { color:"#111", fontWeight:"900", fontSize:24, textAlign:"center" },
  completionSub:      { color:"#777", fontSize:13, textAlign:"center", marginBottom:8 },
  completionStats:    { flexDirection:"row", alignItems:"center", backgroundColor:"#F9FAFB", borderRadius:18, padding:16, width:"100%", marginBottom:8 },
  completionStat:     { flex:1, alignItems:"center", gap:4 },
  completionStatValue:{ color:"#111", fontWeight:"900", fontSize:20 },
  completionStatLabel:{ color:"#999", fontSize:11, fontWeight:"600" },
  completionDivider:  { width:1, height:36, backgroundColor:"#E5E7EB", marginHorizontal:8 },
  completionDoneBtn:  { backgroundColor:COLORS.primary, borderRadius:RADIUS.card, paddingVertical:16, alignItems:"center", width:"100%", marginTop:8 },
  completionDoneTxt:  { color:"#fff", fontWeight:"900", fontSize:16 },
});
