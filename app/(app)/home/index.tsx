import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity,
  ScrollView, Alert, Animated, Image, Modal, Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import * as Battery from "expo-battery";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  trackDriverOnline, trackDriverOffline,
  trackRideRequestReceived, trackRideAccepted,
  trackRideRejected, trackRideIgnored,
} from "@/services/analytics";
import { registerPushToken } from "@/services/notifications";
import { getBatteryLevel, isBatteryTooLow } from "@/services/battery";
import { clearSession, getToken } from "@/services/session";
import * as Notifications from "expo-notifications";
import { COLORS, RADIUS } from "@/constants/theme";

const RIDE_REQUEST_VIBRATION_PATTERN = [0, 800, 400, 800];

const ACTIVE_STATUSES = ["accepted", "arriving", "in_progress"];

const STATUS_COLOR: Record<string, string> = {
  completed:   COLORS.success,
  cancelled:   COLORS.danger,
  in_progress: COLORS.info,
  arriving:    COLORS.warning,
  accepted:    COLORS.warning,
  searching:   COLORS.textFaint,
};

export default function DriverHomeScreen() {
  const { t } = useTranslation();
  const ACTIVE_STATUS_LABELS: Record<string, string> = {
    accepted:    t("home.statusLabels.accepted"),
    arriving:    t("home.statusLabels.arriving"),
    in_progress: t("home.statusLabels.inProgress"),
  };
  const [isOnline,      setIsOnline]      = useState(false);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionRidesRef = useRef<number>(0);
  const [driver,        setDriver]        = useState<any>(null);
  const [toggling,      setToggling]      = useState(false);
  const [rating,        setRating]        = useState("5.0");
  const [totalRides,    setTotalRides]    = useState(0);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [recentTrips,   setRecentTrips]   = useState<any[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [toast,         setToast]         = useState<{ title: string; body: string } | null>(null);
  const [activeBooking,   setActiveBooking]   = useState<any>(null);
  const [isWalletBlocked, setIsWalletBlocked] = useState(false);
  const [isVerified,      setIsVerified]      = useState(true);
  const [docSummary,      setDocSummary]      = useState<{ pending: number; rejected: number } | null>(null);

  const [incomingRide,  setIncomingRide]  = useState<any>(null);
  const [showRidePopup, setShowRidePopup] = useState(false);
  const [countdown,     setCountdown]     = useState(30);
  const [batteryBlocked, setBatteryBlocked] = useState(false);
  const [batteryLevel,   setBatteryLevel]   = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);

  const prevCount        = useRef(0);
  const toastAnim        = useRef(new Animated.Value(-100)).current;
  const toastTimer       = useRef<any>(null);
  const hasRestoredRef   = useRef(false);
  const prevBookingIdRef = useRef<string | null>(null);
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const router           = useRouter();
  const ringtoneRef       = useRef<Audio.Sound | null>(null);
  const ringtoneStopRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRingtone = useCallback(async () => {
    if (ringtoneStopRef.current) { clearTimeout(ringtoneStopRef.current); ringtoneStopRef.current = null; }
    Vibration.cancel();
    try {
      if (ringtoneRef.current) {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
        ringtoneRef.current = null;
      }
    } catch {}
  }, []);

  const playRingtone = useCallback(async () => {
    try {
      await stopRingtone();
      Vibration.vibrate(RIDE_REQUEST_VIBRATION_PATTERN, true);
      const { sound } = await Audio.Sound.createAsync(
        require("../../../assets/sounds/ride_request.wav"),
        { isLooping: true, volume: 1.0 }
      );
      ringtoneRef.current = sound;
      await sound.playAsync();
      // Auto-stop after 30s in case dismissPopup's stopRingtone is missed.
      ringtoneStopRef.current = setTimeout(stopRingtone, 30000);
    } catch {
      // Silent fail — popup still shows even if audio can't play.
    }
  }, [stopRingtone]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    }).catch(() => {});
    return () => { stopRingtone(); };
  }, [stopRingtone]);

  // Live re-check so plugging in a charger while the ride popup is open
  // re-enables Accept immediately, without waiting for the next poll. Also
  // drives the always-visible battery badge below — same listener, no
  // second polling loop.
  const refreshBatteryDisplay = useCallback(async () => {
    try {
      const level = await getBatteryLevel();
      setBatteryLevel(level);
      const state = await Battery.getBatteryStateAsync();
      setBatteryCharging(
        state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL
      );
    } catch {
      setBatteryLevel(null);
    }
  }, []);

  useEffect(() => {
    refreshBatteryDisplay();
    let sub: { remove: () => void } | undefined;
    try {
      sub = Battery.addBatteryStateListener(async () => {
        try {
          setBatteryBlocked(await isBatteryTooLow());
        } catch {}
        refreshBatteryDisplay();
      });
    } catch {}
    return () => { try { sub?.remove(); } catch {} };
  }, [refreshBatteryDisplay]);

  useEffect(() => {
    AsyncStorage.getItem("driver_user").then(u => u && setDriver(JSON.parse(u)));
    fetchProfile();
    fetchRecentReviews();
    fetchRecentTrips();
    fetchUnreadCount();
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      restoreActiveRide();
    }
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const restoreActiveRide = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get(`/gogoo/driver/active-booking`, {
        timeout: 5000,
      });
      if (res.data?.booking_id) {
        router.replace("/(app)/orders" as any);
      }
    } catch {
      // silently fail — show home normally
    }
  };

  const fetchActiveBooking = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const abRes = await api.get(`/gogoo/driver/active-booking`);
      if (abRes.data?.booking_id) {
        const fullRes = await api.get(`/gogoo/bookings/${abRes.data.booking_id}`);
        setActiveBooking(ACTIVE_STATUSES.includes(fullRes.data?.status) ? fullRes.data : null);
      } else {
        setActiveBooking(null);
      }
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchActiveBooking();
    }, [])
  );

  // Poll for incoming ride requests while online
  useEffect(() => {
    if (!isOnline) return;
    const poll = setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.get(`/gogoo/bookings-pending`);
        const bookings: any[] = res.data?.bookings || res.data || [];
        if (bookings.length > 0) {
          const newest = bookings[0];
          if (newest.id !== prevBookingIdRef.current) {
            prevBookingIdRef.current = newest.id;
            setIncomingRide(newest);
            setShowRidePopup(true);
            setCountdown(30);
            acceptTimeRef.current = Date.now();
            startCountdown();
            playRingtone();
            setBatteryBlocked(false); // reset while the fresh check below resolves
            isBatteryTooLow().then(setBatteryBlocked).catch(() => setBatteryBlocked(false));
            trackRideRequestReceived({
              bookingId: newest.id,
              service: newest.service_type?.category || "cab",
              distanceKm: Number(newest.distance_km || 0),
              estimatedFare: Number(newest.estimated_fare || 0),
            });
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(poll);
  }, [isOnline]);

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let count = 30;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) dismissPopup("timeout");
    }, 1000);
  };

  const dismissPopup = (reason: "reject" | "timeout" | "accept" = "timeout") => {
    if (reason === "timeout" && incomingRide) {
      trackRideIgnored({ bookingId: incomingRide.id });
    }
    setShowRidePopup(false);
    setIncomingRide(null);
    setCountdown(30);
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    stopRingtone();
  };

  const acceptTimeRef = useRef<number>(0);

  const handleAccept = async () => {
    if (!incomingRide) return;

    const tooLow = await isBatteryTooLow();
    if (tooLow) {
      setBatteryBlocked(true);
      stopRingtone();
      Alert.alert(
        t("home.alerts.batteryTooLowTitle"),
        t("home.alerts.batteryTooLowMsg"),
        [{ text: t("common.ok") }]
      );
      return;
    }

    const responseTimeSecs = Math.round((Date.now() - acceptTimeRef.current) / 1000);
    try {
      await api.post(`/gogoo/bookings/${incomingRide.id}/accept`, {});
      trackRideAccepted({
        bookingId: incomingRide.id,
        service: incomingRide.service_type?.category || "cab",
        fare: Number(incomingRide.estimated_fare || 0),
        responseTimeSecs,
      });
      sessionRidesRef.current += 1;
      dismissPopup("accept");
      router.push("/(app)/orders" as any);
    } catch (e: any) {
      Alert.alert(t("common.error"), e.response?.data?.error || t("home.alerts.acceptError"));
    }
  };

  const handleReject = () => {
    if (incomingRide) trackRideRejected({ bookingId: incomingRide.id });
    dismissPopup("reject");
  };

  const showToast = (title: string, body: string) => {
    setToast({ title, body });
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true }).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(hideToast, 4500);
  };

  const hideToast = () => {
    Animated.timing(toastAnim, { toValue: -100, duration: 250, useNativeDriver: true }).start(
      () => setToast(null)
    );
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get(`/gogoo/driver/notifications/unread-count`);
      const count = res.data?.count || 0;
      setUnreadCount(count);
      Notifications.setBadgeCountAsync(count).catch(() => {});

      if (count > prevCount.current && prevCount.current >= 0) {
        const notifRes = await api.get(`/gogoo/driver/notifications`);
        const newest = (notifRes.data || []).find((n: any) => !n.is_read);
        if (newest) showToast(newest.title, newest.body);
      }
      prevCount.current = count;
    } catch {}
  };

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get(`/gogoo/driver/profile`);
      if (res.data?.driver_id)               await AsyncStorage.setItem("driver_id", res.data.driver_id);
      if (res.data?.rating)                  setRating(Number(res.data.rating).toFixed(1));
      if (res.data?.total_rides)             setTotalRides(res.data.total_rides);
      if (res.data?.is_online !== undefined) setIsOnline(res.data.is_online);
      setIsWalletBlocked(!!(res.data?.is_wallet_blocked || res.data?.is_blocked));
      setIsVerified(!!res.data?.is_verified);
      if (!res.data?.is_verified && res.data?.driver_id) fetchDocSummary(res.data.driver_id);
    } catch {
      // 401s are handled globally by the shared axios interceptor.
    }
  };

  // While unverified, surface exactly what's outstanding so the driver
  // doesn't have to open the Documents tab just to see if anything's stuck.
  const fetchDocSummary = async (driverId: string) => {
    try {
      const res = await api.get(`/gogoo/drivers/${driverId}/documents`);
      const docs: any[] = res.data?.docs || [];
      const pending = docs.filter(d => d.status === "pending" || d.status === "missing").length;
      const rejected = docs.filter(d => d.status === "rejected").length;
      setDocSummary({ pending, rejected });
    } catch {}
  };

  const fetchRecentReviews = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get(`/gogoo/driver/reviews`);
      setRecentReviews(res.data || []);
    } catch {}
  };

  const fetchRecentTrips = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get(`/gogoo/driver/bookings`);
      setRecentTrips((res.data || []).slice(0, 10));
    } catch {}
  };

  const toggleOnline = async () => {
    setToggling(true);
    const newStatus = !isOnline;
    try {
      const token    = await getToken();
      const driverId = await AsyncStorage.getItem("driver_id");
      if (!token) {
        await clearSession();
        router.replace("/(auth)/login" as any);
        return;
      }
      let lat: number, lng: number;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t("home.alerts.locationRequiredTitle"), t("home.alerts.locationRequiredMsg"));
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch {
        Alert.alert(t("home.alerts.locationRequiredTitle"), t("home.alerts.locationRequiredMsg"));
        return;
      }
      if (driverId) {
        await api.patch(`/gogoo/drivers/${driverId}/online`, { is_online: newStatus, lat, lng });
        if (newStatus) {
          sessionStartRef.current = Date.now();
          sessionRidesRef.current = 0;
          trackDriverOnline({ driverId, vehicleType: driver?.vehicle_type || "unknown" });
          registerPushToken();

          const tooLow = await isBatteryTooLow();
          if (tooLow) {
            const level = await getBatteryLevel();
            const pct = level !== null ? Math.round(level * 100) : "under 15";
            Alert.alert(
              t("home.alerts.lowBatteryTitle"),
              t("home.alerts.lowBatteryMsg", { pct })
            );
          }
        } else {
          const durationMins = Math.round((Date.now() - sessionStartRef.current) / 60000);
          trackDriverOffline({ driverId, sessionDurationMins: durationMins, ridesCompleted: sessionRidesRef.current });
        }
        setIsOnline(newStatus);
      } else {
        Alert.alert(t("common.error"), t("home.alerts.driverIdMissing"));
        await clearSession();
        router.replace("/(auth)/login" as any);
      }
    } catch (e: any) {
      if (e?.response?.status === 401) {
        // Handled globally by the shared axios interceptor.
        return;
      }
      if (e?.response?.data?.error === "verification_pending") {
        setIsOnline(false);
        Alert.alert(
          t("home.alerts.verificationTitle"),
          t("home.alerts.verificationMsg"),
          [
            { text: t("home.alerts.viewDocuments"), onPress: () => router.push("/(app)/documents" as any) },
            { text: t("common.ok"), style: "cancel" },
          ]
        );
        return;
      }
      Alert.alert(t("common.error"), t("home.alerts.updateStatusError"));
    } finally {
      setToggling(false);
    }
  };

  const firstName = driver?.name?.split(" ")[0] || t("home.driverFallback");

  return (
    <SafeAreaView style={s.safe}>
      {/* In-app notification toast */}
      {toast && (
        <Animated.View style={[s.toast, { transform: [{ translateY: toastAnim }] }]}>
          <TouchableOpacity
            style={s.toastInner}
            onPress={() => { hideToast(); setUnreadCount(0); router.push("/(app)/notifications"); }}
            activeOpacity={0.9}
          >
            <View style={s.toastIcon}>
              <Ionicons name="notifications" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.toastTitle} numberOfLines={1}>{toast.title}</Text>
              <Text style={s.toastBody}  numberOfLines={2}>{toast.body}</Text>
            </View>
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color="#999" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.logoBar}>
          <Image source={require("../../../assets/logo.png")} style={s.logo} resizeMode="contain" />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.name}>{t("home.greeting", { name: firstName })}</Text>
            <Text style={s.subName}>{t("home.subGreeting")}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              style={s.bellBtn}
              onPress={() => { setUnreadCount(0); router.push("/(app)/notifications"); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="notifications-outline" size={22} color="#555" />
              {unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{firstName[0]}</Text>
            </View>
          </View>
        </View>

        {/* Battery status — always visible, not just when it blocks ride-accept */}
        {batteryLevel !== null && (
          <View
            style={[
              s.batteryPill,
              batteryLevel < 0.15 && !batteryCharging && s.batteryPillUrgent,
            ]}
          >
            <Text style={s.batteryPillIcon}>
              {batteryCharging ? "⚡" : "🔋"}
            </Text>
            <Text
              style={[
                s.batteryPillText,
                batteryLevel < 0.15 && !batteryCharging && s.batteryPillTextUrgent,
                batteryLevel >= 0.15 && batteryLevel < 0.5 && !batteryCharging && s.batteryPillTextMedium,
              ]}
            >
              {Math.round(batteryLevel * 100)}%
            </Text>
          </View>
        )}

        {/* Online toggle */}
        <View style={[s.toggleCard, isOnline && s.toggleCardActive]}>
          <View style={s.toggleLeft}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? "#6EE7B7" : "#CCC" }]} />
            <View>
              <Text style={s.toggleTitle}>{isOnline ? t("home.toggle.onlineTitle") : t("home.toggle.offlineTitle")}</Text>
              <Text style={s.toggleSub}>{isOnline ? t("home.toggle.onlineSub") : t("home.toggle.offlineSub")}</Text>
            </View>
          </View>
          <Switch value={isOnline} onValueChange={toggleOnline} disabled={toggling}
            trackColor={{ false: "#E5E5E5", true: COLORS.primary + "40" }}
            thumbColor={isOnline ? COLORS.primary : "#CCC"}
            ios_backgroundColor="#E5E5E5" />
        </View>

        {/* Verification pending banner */}
        {!isVerified && (
          <TouchableOpacity
            style={s.verifyBanner}
            onPress={() => router.push("/(app)/documents" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.verifyBannerTitle}>{t("home.verifyBanner.title")}</Text>
            <Text style={s.verifyBannerText}>
              {t("home.verifyBanner.text")}
              {docSummary && (docSummary.pending > 0 || docSummary.rejected > 0)
                ? `  ${docSummary.pending > 0 ? t("home.verifyBanner.pendingCount", { count: docSummary.pending }) : ""}${docSummary.pending > 0 && docSummary.rejected > 0 ? " · " : ""}${docSummary.rejected > 0 ? t("home.verifyBanner.rejectedCount", { count: docSummary.rejected }) : ""}.`
                : ""}
            </Text>
            <Text style={s.verifyBannerLink}>{t("home.verifyBanner.link")}</Text>
          </TouchableOpacity>
        )}

        {/* Wallet blocked banner */}
        {isWalletBlocked && (
          <View style={s.blockedBanner}>
            <Text style={s.blockedText}>
              {t("home.blockedBanner.text")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(app)/profile/ledger" as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.blockedLink}>{t("home.blockedBanner.link")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active ride banner */}
        {activeBooking && (
          <TouchableOpacity
            style={s.activeRideCard}
            onPress={() => router.push("/(app)/orders" as any)}
            activeOpacity={0.85}
          >
            <View style={s.activeRideDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.activeRideTitle}>
                {ACTIVE_STATUS_LABELS[activeBooking.status] || t("home.activeRide.fallbackTitle")}
              </Text>
              <Text style={s.activeRideSub} numberOfLines={1}>
                {activeBooking.drop?.address || t("common.dropLocationFallback")}
              </Text>
            </View>
            <Text style={s.activeRideArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <Text style={s.sectionTitle}>{t("home.stats.title")}</Text>
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statIcon}>⭐</Text>
            <Text style={s.statValue}>{rating}</Text>
            <Text style={s.statLabel}>{t("home.stats.rating")}</Text>
          </View>
          <View style={[s.statCard, { marginRight: 0 }]}>
            <Text style={s.statIcon}>🗺</Text>
            <Text style={s.statValue}>{totalRides}</Text>
            <Text style={s.statLabel}>{t("home.stats.totalRides")}</Text>
          </View>
        </View>

        {/* Recent Trips */}
        {recentTrips.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={s.sectionTitle}>{t("home.recentTrips.title")}</Text>
            {recentTrips.map((trip: any, i: number) => {
              const dotColor = STATUS_COLOR[trip.status] || "#999";
              const dateStr = trip.created_at
                ? new Date(trip.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : "";
              const timeStr = trip.created_at
                ? new Date(trip.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";
              return (
                <View key={trip.id || i} style={s.tripCard}>
                  <View style={s.tripTop}>
                    <View style={s.tripBadgeWrap}>
                      <View style={[s.tripDot, { backgroundColor: dotColor }]} />
                      <Text style={[s.tripStatus, { color: dotColor }]}>
                        {trip.status.replace(/_/g, " ").toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.tripRight}>
                      <Text style={s.tripFare}>
                        {trip.fare > 0 ? `₹${Math.round(trip.fare)}` : "—"}
                      </Text>
                      <Text style={s.tripDate}>{dateStr}  {timeStr}</Text>
                    </View>
                  </View>
                  <View style={s.tripRoute}>
                    <View style={s.tripRouteRow}>
                      <View style={[s.routeDot, { backgroundColor: COLORS.success }]} />
                      <Text style={s.tripAddr} numberOfLines={1}>{trip.pickup_address || t("common.pickupFallback")}</Text>
                    </View>
                    <View style={s.routeLine} />
                    <View style={s.tripRouteRow}>
                      <View style={[s.routeDot, { backgroundColor: COLORS.primary }]} />
                      <Text style={s.tripAddr} numberOfLines={1}>{trip.drop_address || t("common.dropFallback")}</Text>
                    </View>
                  </View>
                  <View style={s.tripMeta}>
                    {trip.distance_km > 0 && (
                      <Text style={s.tripMetaText}>📍 {Number(trip.distance_km).toFixed(1)} km</Text>
                    )}
                    {trip.rider_name ? <Text style={s.tripMetaText}>👤 {trip.rider_name}</Text> : null}
                    {trip.service_name ? <Text style={s.tripMetaText}>🚗 {trip.service_name}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={s.sectionTitle}>{t("home.reviews.title")}</Text>
            {recentReviews.map((rev: any, i: number) => (
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarText}>{(rev.rider_name || "R")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewName}>{rev.rider_name || t("common.riderFallback")}</Text>
                    <View style={{ flexDirection: "row" }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Text key={star} style={{ fontSize: 14, color: star <= (rev.driver_rating || 0) ? COLORS.primary : "#DDD" }}>★</Text>
                      ))}
                    </View>
                  </View>
                  <Text style={s.reviewDate}>
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </Text>
                </View>
                {rev.driver_review ? <Text style={s.reviewText}>{rev.driver_review}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {!isOnline && recentTrips.length === 0 && (
          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>{t("home.tips.title")}</Text>
            <Text style={s.tipItem}>{t("home.tips.item1")}</Text>
            <Text style={s.tipItem}>{t("home.tips.item2")}</Text>
            <Text style={s.tipItem}>{t("home.tips.item3")}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Incoming ride request popup */}
      <Modal
        visible={showRidePopup}
        transparent
        animationType="slide"
        onRequestClose={() => dismissPopup("reject")}
      >
        <View style={s.popupOverlay}>
          <View style={s.popupCard}>

            <View style={s.countdownRow}>
              <View style={s.countdownCircle}>
                <Text style={s.countdownText}>{countdown}</Text>
                <Text style={s.countdownLabel}>{t("home.popup.countdownSec")}</Text>
              </View>
              <View style={s.popupHeader}>
                <Text style={s.popupTitle}>{t("home.popup.title")}</Text>
                <Text style={s.popupSubtitle}>
                  {incomingRide?.service_type?.name ?? t("home.popup.serviceFallback")} • ~₹{Math.round(incomingRide?.estimated_fare ?? 0)}
                </Text>
              </View>
            </View>

            <View style={s.popupDivider} />

            <View style={s.routeContainer}>
              <View style={s.popupRouteRow}>
                <View style={[s.popupRouteDot, s.routeDotGreen]} />
                <Text style={s.popupRouteText} numberOfLines={2}>
                  {incomingRide?.pickup_address ?? t("common.pickupLocationFallback")}
                </Text>
              </View>
              <View style={s.popupRouteLine} />
              <View style={s.popupRouteRow}>
                <View style={[s.popupRouteDot, s.routeDotOrange]} />
                <Text style={s.popupRouteText} numberOfLines={2}>
                  {incomingRide?.drop_address ?? t("common.dropLocationFallback")}
                </Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={s.statChipLabel}>{t("home.popup.distanceLabel")}</Text>
                <Text style={s.statChipValue}>
                  {incomingRide?.distance_km
                    ? t("common.distanceKm", { km: Number(incomingRide.distance_km).toFixed(1) })
                    : "--"}
                </Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statChipLabel}>{t("home.popup.fareLabel")}</Text>
                <Text style={s.statChipValue}>₹{Math.round(incomingRide?.estimated_fare ?? 0)}</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statChipLabel}>{t("home.popup.typeLabel")}</Text>
                <Text style={s.statChipValue}>{incomingRide?.service_type?.category ?? t("home.popup.typeFallback")}</Text>
              </View>
            </View>

            <View style={s.popupActions}>
              <TouchableOpacity style={s.rejectBtn} onPress={handleReject}>
                <Text style={s.rejectBtnText}>{t("home.popup.reject")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.acceptBtn, batteryBlocked && s.acceptBtnDisabled]}
                onPress={handleAccept}
                disabled={batteryBlocked}
              >
                <Text style={s.acceptBtnText}>{t("home.popup.accept")}</Text>
              </TouchableOpacity>
            </View>
            {batteryBlocked && (
              <Text style={s.batteryHint}>{t("home.popup.batteryHint")}</Text>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bg },
  logoBar:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 44, paddingBottom: 4 },
  logo:             { width: 180, height: 64, marginLeft: -38 },
  scroll:           { flex: 1, paddingHorizontal: 20, paddingBottom: 80 },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 16 },
  name:             { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  subName:          { color: "#777", fontSize: 13, marginTop: 2 },
  avatar:           { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarText:       { color: "#fff", fontWeight: "900", fontSize: 18 },

  toast:            { position: "absolute", top: 0, left: 0, right: 0, zIndex: 999, paddingHorizontal: 12, paddingTop: 52 },
  toastInner:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: RADIUS.card, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: "#FFE5D9" },
  toastIcon:        { width: 36, height: 36, borderRadius: RADIUS.input, backgroundColor: COLORS.primaryTint, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toastTitle:       { color: COLORS.textPrimary, fontWeight: "800", fontSize: 13 },
  toastBody:        { color: "#666", fontSize: 12, marginTop: 2, lineHeight: 16 },

  batteryPill:      { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, backgroundColor: "#F0FDF4", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14 },
  batteryPillUrgent:{ backgroundColor: "#FEF2F2" },
  batteryPillIcon:  { fontSize: 13 },
  batteryPillText:  { fontSize: 13, fontWeight: "700", color: COLORS.success },
  batteryPillTextMedium: { color: COLORS.warning },
  batteryPillTextUrgent: { color: COLORS.danger },
  toggleCard:       { backgroundColor: COLORS.white, borderRadius: RADIUS.sheet, borderWidth: 1.5, borderColor: COLORS.borderSubtle, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  toggleCardActive: { borderColor: "#6EE7B7", backgroundColor: "#F0FDF4" },
  toggleLeft:       { flexDirection: "row", alignItems: "center" },
  statusDot:        { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  toggleTitle:      { color: COLORS.textPrimary, fontWeight: "700", fontSize: 16 },
  toggleSub:        { color: "#777", fontSize: 12, marginTop: 2 },

  sectionTitle:     { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 12 },

  statsGrid:        { flexDirection: "row", marginBottom: 20 },
  statCard:         { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.input, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 14, alignItems: "center", marginRight: 10 },
  statIcon:         { fontSize: 20, marginBottom: 6 },
  statValue:        { color: COLORS.textPrimary, fontWeight: "800", fontSize: 22 },
  statLabel:        { color: "#999", fontSize: 11, marginTop: 2 },

  tripCard:         { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 14, marginBottom: 10 },
  tripTop:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  tripBadgeWrap:    { flexDirection: "row", alignItems: "center", gap: 6 },
  tripDot:          { width: 8, height: 8, borderRadius: 4 },
  tripStatus:       { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  tripRight:        { alignItems: "flex-end" },
  tripFare:         { color: COLORS.textPrimary, fontWeight: "800", fontSize: 18 },
  tripDate:         { color: "#AAA", fontSize: 11, marginTop: 2 },
  tripRoute:        { paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  tripRouteRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  routeDot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeLine:        { width: 1, height: 10, backgroundColor: "#DEDEDE", marginLeft: 3.5, marginVertical: 2 },
  tripAddr:         { flex: 1, color: "#444", fontSize: 13 },
  tripMeta:         { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  tripMetaText:     { color: "#777", fontSize: 12 },

  reviewCard:       { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 14, marginBottom: 10 },
  reviewTop:        { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  reviewAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 10 },
  reviewAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  reviewName:       { color: COLORS.textPrimary, fontWeight: "700", fontSize: 13 },
  reviewDate:       { color: "#AAA", fontSize: 11 },
  reviewText:       { color: "#555", fontSize: 13, lineHeight: 18, marginTop: 6 },

  tipsCard:         { backgroundColor: COLORS.primaryTint2, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.primaryBorder, padding: 16, marginBottom: 32 },
  tipsTitle:        { color: COLORS.primary, fontWeight: "800", fontSize: 14, marginBottom: 8 },
  tipItem:          { color: "#555", fontSize: 13, marginBottom: 4 },

  bellBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgFaint, alignItems: "center", justifyContent: "center" },
  badge:            { position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText:        { color: "#fff", fontSize: 9, fontWeight: "900" },

  blockedBanner:    { backgroundColor: "#FEE2E2", borderRadius: RADIUS.input, borderLeftWidth: 4, borderLeftColor: COLORS.danger, padding: 14, marginBottom: 16 },
  blockedText:      { fontSize: 13, color: "#991B1B", fontWeight: "600", marginBottom: 6, lineHeight: 18 },
  blockedLink:      { fontSize: 13, color: COLORS.danger, fontWeight: "700" },

  verifyBanner:     { backgroundColor: COLORS.warningTint, borderRadius: RADIUS.input, borderLeftWidth: 4, borderLeftColor: COLORS.warning, padding: 14, marginBottom: 16 },
  verifyBannerTitle:{ fontSize: 13, color: COLORS.warningStrong, fontWeight: "800", marginBottom: 4 },
  verifyBannerText: { fontSize: 12, color: COLORS.warningStrong, lineHeight: 17, marginBottom: 6 },
  verifyBannerLink: { fontSize: 13, color: COLORS.warning, fontWeight: "700" },

  activeRideCard:   { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.success, borderRadius: RADIUS.card, padding: 16, marginBottom: 20, gap: 12 },
  activeRideDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff", opacity: 0.9 },
  activeRideTitle:  { color: "#fff", fontWeight: "800", fontSize: 14 },
  activeRideSub:    { color: "#D1FAE5", fontSize: 12, marginTop: 2 },
  activeRideArrow:  { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Ride request popup
  popupOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  popupCard:        { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  countdownRow:     { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 16 },
  countdownCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryTint2, borderWidth: 3, borderColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  countdownText:    { fontSize: 20, fontWeight: "800", color: COLORS.primary, lineHeight: 22 },
  countdownLabel:   { fontSize: 10, color: COLORS.primary, fontWeight: "600" },
  popupHeader:      { flex: 1 },
  popupTitle:       { fontSize: 20, fontWeight: "800", color: COLORS.textStrong, marginBottom: 4 },
  popupSubtitle:    { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  popupDivider:     { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  routeContainer:   { marginBottom: 16 },
  popupRouteRow:    { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 },
  popupRouteDot:    { width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0 },
  routeDotGreen:    { backgroundColor: COLORS.success },
  routeDotOrange:   { backgroundColor: COLORS.primary },
  popupRouteLine:   { width: 2, height: 16, backgroundColor: COLORS.borderStrong, marginLeft: 5, marginVertical: 2 },
  popupRouteText:   { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: "500", lineHeight: 20 },
  statsRow:         { flexDirection: "row", gap: 8, marginBottom: 20 },
  statChip:         { flex: 1, backgroundColor: COLORS.bgAlt, borderRadius: RADIUS.input, padding: 12, alignItems: "center" },
  statChipLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", letterSpacing: 0.5, marginBottom: 4 },
  statChipValue:    { fontSize: 14, fontWeight: "700", color: COLORS.textStrong },
  popupActions:     { flexDirection: "row", gap: 12 },
  rejectBtn:        { flex: 1, backgroundColor: COLORS.dangerTint, borderRadius: RADIUS.card, paddingVertical: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#FECACA" },
  rejectBtnText:    { color: COLORS.danger, fontSize: 15, fontWeight: "700" },
  acceptBtn:        { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.card, paddingVertical: 16, alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  acceptBtnDisabled:{ backgroundColor: "#D1D5DB", shadowOpacity: 0 },
  acceptBtnText:    { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  batteryHint:      { color: COLORS.danger, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 10 },
});
