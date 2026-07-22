/**
 * gogoo Driver App — Analytics Service
 * Dual-writes every event: Firebase Analytics + our own PostgreSQL backend.
 * All functions are wrapped in try/catch — this file NEVER crashes the app.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { Dimensions, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getToken } from "./session";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

// A thrown error here would happen at module-evaluation time (this file is
// imported from the root layout), before React mounts — the ErrorBoundary
// can't catch that, so it would crash the app on every open. Guard fn() too,
// not just its promise, in case a stubbed-out native call throws sync.
const safe = (fn: () => Promise<void>) => {
  try { return fn().catch(() => {}); } catch { return Promise.resolve(); }
};

// ── Optional packages — safe dynamic require ───────────────────────────
let Device: any      = null;
let Application: any = null;
let Localization: any= null;
let NetInfo: any     = null;
try { Device      = require("expo-device"); }                                     catch {}
try { Application = require("expo-application"); }                                catch {}
try { Localization = require("expo-localization"); }                              catch {}
try { const ni = require("@react-native-community/netinfo"); NetInfo = ni.default ?? ni; } catch {}

// Firebase native modules — same reasoning as above, but even more likely to
// be unavailable (e.g. a JS-only expo-updates OTA push landing on a native
// build compiled before these were added). Fall back to no-op stubs so every
// analytics()/crashlytics() call site below keeps working unchanged.
const noopAnalyticsInstance = {
  logEvent: async () => {}, setUserId: async () => {}, setUserProperties: async () => {},
  logScreenView: async () => {}, logLogin: async () => {},
};
const noopCrashlyticsInstance = {
  recordError: async () => {}, setUserId: async () => {}, setAttributes: async () => {},
};
let realAnalytics: any = null;
let realCrashlytics: any = null;
try { realAnalytics   = require("@react-native-firebase/analytics").default; }   catch {}
try { realCrashlytics = require("@react-native-firebase/crashlytics").default; } catch {}
const analytics = () => { try { return realAnalytics ? realAnalytics() : noopAnalyticsInstance; } catch { return noopAnalyticsInstance; } };
const crashlytics = () => { try { return realCrashlytics ? realCrashlytics() : noopCrashlyticsInstance; } catch { return noopCrashlyticsInstance; } };

// ── Module-level session state ─────────────────────────────────────────
let sessionId         = "";
let sessionStartTime  = Date.now();
let sessionScreenCount= 0;
let currentDriverId   = "";
let currentCity       = "";
let currentArea       = "";
let deviceInfoCached: any     = null;
let lastInteractionTime       = Date.now();
let totalActiveMs             = 0;
let totalIdleMs               = 0;
const navHistory: string[]    = [];
const scrollMilestones: Record<string, Set<number>> = {};

// ── Helper: dual-write to our backend ─────────────────────────────────
const postToBackend = async (
  eventName: string,
  extras: Record<string, any> = {}
) => {
  try {
    const token = await getToken();
    if (!token) return;
    await axios.post(
      `${API}/gogoo/analytics/event`,
      {
        event_name:         eventName,
        user_id:            currentDriverId,
        user_type:          "driver",
        screen_name:        extras.screen_name ?? extras.screen ?? "",
        time_spent_seconds: extras.time_spent_seconds ?? 0,
        city:               currentCity,
        area:               currentArea,
        device_model:       deviceInfoCached?.device_model ?? "",
        os_version:         deviceInfoCached?.os_version   ?? "",
        app_version:        deviceInfoCached?.app_version  ?? "",
        network_type:       deviceInfoCached?.network_type ?? "",
        session_id:         sessionId,
        retention_bucket:   extras.retention_bucket ?? "",
        properties:         extras,
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 6000 }
    );
  } catch {}
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 1 — Screen time hook (add to (app)/_layout.tsx)
// ═══════════════════════════════════════════════════════════════════════
export const useScreenTimeTracker = () => {
  const pathname   = usePathname();
  const prevScreen = useRef("");
  const enterTime  = useRef(Date.now());

  useEffect(() => {
    if (prevScreen.current) {
      const spentSecs = Math.round((Date.now() - enterTime.current) / 1000);
      safe(() =>
        analytics().logEvent("screen_time_spent", {
          screen_name:        prevScreen.current,
          time_spent_seconds: spentSecs,
          next_screen:        pathname,
        })
      );
      postToBackend("screen_time_spent", {
        screen_name:        prevScreen.current,
        time_spent_seconds: spentSecs,
        next_screen:        pathname,
      });
      if (spentSecs < 2) {
        safe(() => analytics().logEvent("screen_bounce", { screen_name: prevScreen.current }));
        postToBackend("screen_bounce", { screen_name: prevScreen.current });
      }
    }
    safe(() => analytics().logScreenView({ screen_name: pathname, screen_class: pathname }));
    postToBackend("screen_view", { screen_name: pathname });
    sessionScreenCount++;
    prevScreen.current = pathname;
    enterTime.current  = Date.now();
  }, [pathname]);
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 2 — Session tracking
// ═══════════════════════════════════════════════════════════════════════
export const startDriverSession = async (driverId: string) => {
  sessionStartTime    = Date.now();
  sessionScreenCount  = 0;
  sessionId           = `driver_${driverId}_${Date.now()}`;
  currentDriverId     = driverId;
  safe(async () => {
    await analytics().setUserId(driverId);
    await analytics().logEvent("session_start", { session_id: sessionId, user_type: "driver" });
  });
  postToBackend("session_start", { session_id: sessionId });
};

export const endDriverSession = async () => {
  const durationSecs = Math.round((Date.now() - sessionStartTime) / 1000);
  safe(() =>
    analytics().logEvent("session_end", {
      session_id: sessionId, duration_seconds: durationSecs, screens_visited: sessionScreenCount,
    })
  );
  postToBackend("session_end", { session_id: sessionId, duration_seconds: durationSecs, screens_visited: sessionScreenCount });
  await reportDriverEngagement();
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 3 — Location tracking
// ═══════════════════════════════════════════════════════════════════════
export const trackDriverCurrentLocation = async () => {
  try {
    const Location = require("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    const area = geo[0]?.district ?? geo[0]?.subregion ?? geo[0]?.city ?? "Unknown";
    const city = geo[0]?.city ?? geo[0]?.region ?? "Delhi";
    currentCity = city;
    currentArea = area;
    safe(async () => {
      await analytics().setUserProperties({ current_city: city, current_area: area, user_type: "driver" });
      await analytics().logEvent("driver_location_tracked", { city, area });
    });
    postToBackend("driver_location_tracked", { city, area });
    return { city, area, lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 4 — Device info
// ═══════════════════════════════════════════════════════════════════════
export const trackDriverDeviceInfo = async () => {
  if (deviceInfoCached) return deviceInfoCached;
  try {
    const { width, height } = Dimensions.get("window");
    const info: Record<string, any> = {
      device_model:  Device?.modelName ?? "unknown",
      device_brand:  Device?.brand     ?? "unknown",
      os_name:       Platform.OS,
      os_version:    Device?.osVersion ?? String(Platform.Version),
      app_version:   Application?.nativeApplicationVersion ?? "unknown",
      build_number:  Application?.nativeBuildVersion       ?? "unknown",
      screen_width:  width,
      screen_height: height,
      locale:        Localization?.getLocales?.()?.[0]?.languageTag ?? "en-IN",
      timezone:      Localization?.getCalendars?.()?.[0]?.timeZone  ?? "Asia/Kolkata",
    };
    if (NetInfo) {
      const net = await NetInfo.fetch();
      info.network_type = net.type ?? "unknown";
      info.is_connected  = net.isConnected;
    }
    deviceInfoCached = info;
    safe(async () => {
      await analytics().setUserProperties({
        device_model: info.device_model, os_version: info.os_version,
        app_version:  info.app_version,  network_type: info.network_type ?? "unknown",
      });
      await analytics().logEvent("device_info", info);
    });
    postToBackend("device_info", info);
    return info;
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 5 — Navigation flow
// ═══════════════════════════════════════════════════════════════════════
export const trackNavigation = async (
  fromScreen: string, toScreen: string, method: "tap" | "back" | "swipe" = "tap"
) => {
  navHistory.push(toScreen);
  if (navHistory.length > 20) navHistory.shift();
  safe(() =>
    analytics().logEvent("navigation_flow", {
      from_screen: fromScreen, to_screen: toScreen, navigation_method: method, flow_position: navHistory.length,
    })
  );
  postToBackend("navigation_flow", { from_screen: fromScreen, to_screen: toScreen, navigation_method: method });
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 6 — Retention
// ═══════════════════════════════════════════════════════════════════════
export const trackDriverRetention = async (driverId: string) => {
  try {
    const stored = await AsyncStorage.getItem("gg_driver_first_seen");
    const now    = new Date();
    if (!stored) {
      await AsyncStorage.setItem("gg_driver_first_seen", now.toISOString());
      safe(() => analytics().logEvent("new_driver", { driver_id: driverId }));
      postToBackend("new_driver", { user_id: driverId, retention_bucket: "new" });
      return "new";
    }
    const daysSince = Math.floor((now.getTime() - new Date(stored).getTime()) / 86400000);
    const bucket    =
      daysSince === 0 ? "same_day" : daysSince === 1 ? "day_1" :
      daysSince <= 7  ? "day_7"    : daysSince <= 30 ? "day_30" : "day_30_plus";
    safe(() => analytics().logEvent("driver_retention", { driver_id: driverId, days_since_first_open: daysSince, retention_bucket: bucket }));
    postToBackend("driver_retention", { user_id: driverId, days_since_first_open: daysSince, retention_bucket: bucket });
    return bucket;
  } catch {
    return "unknown";
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 7 — Engagement
// ═══════════════════════════════════════════════════════════════════════
export const trackDriverInteraction = () => {
  const now = Date.now();
  const gap = now - lastInteractionTime;
  if (gap < 5000) totalActiveMs += gap;
  else            totalIdleMs   += gap;
  lastInteractionTime = now;
};

export const reportDriverEngagement = async () => {
  const activeSecs = Math.round(totalActiveMs / 1000);
  const idleSecs   = Math.round(totalIdleMs   / 1000);
  safe(() => analytics().logEvent("driver_engagement", { active_time_seconds: activeSecs, idle_time_seconds: idleSecs }));
  postToBackend("user_engagement", { active_time_seconds: activeSecs, idle_time_seconds: idleSecs });
  totalActiveMs = 0;
  totalIdleMs   = 0;
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 8 — Scroll depth
// ═══════════════════════════════════════════════════════════════════════
export const trackScrollDepth = async (screenName: string, scrollPercent: number) => {
  if (!scrollMilestones[screenName]) scrollMilestones[screenName] = new Set();
  const hit = [25, 50, 75, 100].find((m) => scrollPercent >= m);
  if (hit && !scrollMilestones[screenName].has(hit)) {
    scrollMilestones[screenName].add(hit);
    safe(() => analytics().logEvent("scroll_depth", { screen_name: screenName, depth_percent: hit }));
    postToBackend("scroll_depth", { screen_name: screenName, depth_percent: hit });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 9 — Button clicks
// ═══════════════════════════════════════════════════════════════════════
export const trackButtonClick = async (params: {
  buttonName: string; screen: string; context?: Record<string, any>;
}) => {
  safe(() =>
    analytics().logEvent("button_clicked", { button_name: params.buttonName, screen_name: params.screen, ...params.context })
  );
  postToBackend("button_clicked", { button_name: params.buttonName, screen_name: params.screen, ...params.context });
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 12 — Usage pattern
// ═══════════════════════════════════════════════════════════════════════
export const trackUsagePattern = async () => {
  const now = new Date();
  safe(() =>
    analytics().logEvent("usage_pattern", {
      hour_of_day: now.getHours(), day_of_week: now.getDay(),
      is_weekend: now.getDay() === 0 || now.getDay() === 6, month: now.getMonth() + 1,
    })
  );
  postToBackend("usage_pattern", { hour_of_day: now.getHours(), day_of_week: now.getDay() });
};

// ═══════════════════════════════════════════════════════════════════════
// Composite: call on every driver app foreground
// ═══════════════════════════════════════════════════════════════════════
export const trackDriverAppOpened = async (driverId: string) => {
  try {
    await trackDriverDeviceInfo();
    await trackDriverCurrentLocation();
    await trackUsagePattern();
    await trackDriverRetention(driverId);
    safe(() => analytics().logEvent("app_opened", { user_id: driverId, user_type: "driver" }));
    postToBackend("app_opened", { user_id: driverId });
  } catch {}
};

// ═══════════════════════════════════════════════════════════════════════
// Existing event helpers (unchanged — Firebase only)
// ═══════════════════════════════════════════════════════════════════════

export const setDriverProperties = (driver: {
  id: string; name?: string; vehicleType?: string; city?: string;
}) =>
  safe(async () => {
    await analytics().setUserId(driver.id);
    await analytics().setUserProperties({
      driver_name: driver.name || "unknown", vehicle_type: driver.vehicleType || "unknown",
      user_type: "driver", city: driver.city || "Delhi",
    });
    await crashlytics().setUserId(driver.id);
    await crashlytics().setAttributes({ name: driver.name || "unknown", vehicle: driver.vehicleType || "unknown", type: "driver" });
  });

export const trackDriverLogin = (params: { driverId: string; vehicleType: string }) =>
  safe(async () => {
    await analytics().logLogin({ method: "phone_otp" });
    await analytics().setUserId(params.driverId);
    await analytics().setUserProperties({ vehicle_type: params.vehicleType, user_type: "driver" });
  });

export const trackDriverLogout = () =>
  safe(async () => { await analytics().logEvent("driver_logout"); await analytics().setUserId(""); });

export const trackDriverSessionExpired = () => safe(() => analytics().logEvent("driver_session_expired"));

export const trackDriverOnline = (params: { driverId: string; vehicleType: string; area?: string }) =>
  safe(() =>
    analytics().logEvent("driver_went_online", {
      driver_id: params.driverId, vehicle_type: params.vehicleType,
      area: params.area || "unknown", timestamp: new Date().toISOString(),
    })
  );

export const trackDriverOffline = (params: { driverId: string; sessionDurationMins: number; ridesCompleted: number }) =>
  safe(() =>
    analytics().logEvent("driver_went_offline", {
      driver_id: params.driverId, session_duration_mins: params.sessionDurationMins, rides_completed: params.ridesCompleted,
    })
  );

export const trackRideRequestReceived = (params: { bookingId: string; service: string; distanceKm: number; estimatedFare: number }) =>
  safe(() =>
    analytics().logEvent("ride_request_received", {
      booking_id: params.bookingId, service_type: params.service,
      distance_km: params.distanceKm, estimated_fare: params.estimatedFare,
    })
  );

export const trackRideAccepted = (params: { bookingId: string; service: string; fare: number; responseTimeSecs: number }) =>
  safe(() =>
    analytics().logEvent("ride_accepted", {
      booking_id: params.bookingId, service_type: params.service,
      fare: params.fare, response_time_secs: params.responseTimeSecs,
    })
  );

export const trackRideRejected = (params: { bookingId: string; reason?: string }) =>
  safe(() => analytics().logEvent("ride_rejected", { booking_id: params.bookingId, reject_reason: params.reason || "timeout" }));

export const trackRideIgnored = (params: { bookingId: string }) =>
  safe(() => analytics().logEvent("ride_ignored", { booking_id: params.bookingId }));

export const trackOTPVerified = (params: { bookingId: string; attempts: number }) =>
  safe(() => analytics().logEvent("otp_verified", { booking_id: params.bookingId, attempts: params.attempts }));

export const trackOTPFailed = (params: { bookingId: string; attempts: number }) =>
  safe(() => analytics().logEvent("otp_failed", { booking_id: params.bookingId, attempts: params.attempts }));

export const trackRideCompleted = (params: { bookingId: string; service: string; fare: number; distanceKm: number; durationMins: number }) =>
  safe(() =>
    analytics().logEvent("ride_completed", {
      booking_id: params.bookingId, service_type: params.service,
      fare: params.fare, distance_km: params.distanceKm, duration_mins: params.durationMins,
    })
  );

export const trackEarningsViewed = (params: { totalEarnings: number; walletBalance: number; totalRides: number }) =>
  safe(() =>
    analytics().logEvent("earnings_viewed", { total_earnings: params.totalEarnings, wallet_balance: params.walletBalance, total_rides: params.totalRides })
  );

export const trackLedgerViewed = () => safe(() => analytics().logEvent("ledger_viewed"));

export const trackDocumentUploaded = (params: { docType: string }) =>
  safe(() => analytics().logEvent("document_uploaded", { doc_type: params.docType }));

export const trackDocumentApproved = (params: { docType: string }) =>
  safe(() => analytics().logEvent("document_approved", { doc_type: params.docType }));

export const trackDocumentRejected = (params: { docType: string; reason: string }) =>
  safe(() => analytics().logEvent("document_rejected", { doc_type: params.docType, reject_reason: params.reason }));

export const trackDriverSupportOpened = () => safe(() => analytics().logEvent("driver_support_opened"));

export const trackDriverSupportChatStarted = (params: { category: string }) =>
  safe(() => analytics().logEvent("driver_support_chat_started", { category: params.category }));

export const trackDriverError = (params: { error: string; screen: string; fatal?: boolean }) =>
  safe(async () => {
    await analytics().logEvent("driver_app_error", { error_message: params.error, screen: params.screen, is_fatal: params.fatal || false });
    await crashlytics().recordError(new Error(`[DRIVER][${params.screen}] ${params.error}`));
    postToBackend("app_error", { screen_name: params.screen, error_message: params.error });
  });

export const trackScreenView = (screenName: string) =>
  safe(() => analytics().logScreenView({ screen_name: screenName, screen_class: screenName }));
