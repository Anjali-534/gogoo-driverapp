import axios from "axios";
import { router } from "expo-router";
import { Alert } from "react-native";
import { clearSession, getToken, setToken } from "./session";
import i18n from "@/i18n";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

// Shared axios instance for all backend calls: attaches the driver's auth
// token on every request and reacts to a 401 from ANY call site the same
// way (clear session, bounce to login) instead of each screen re-implementing
// that check ad hoc — see the driver-app Fix 3 audit for why this exists.
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && !config.headers?.Authorization) {
    config.headers = (config.headers || {}) as typeof config.headers;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manual base64 decode — `atob` isn't reliably available under Hermes/React
// Native without an explicit polyfill this project doesn't have, and a
// silent atob failure here would make refreshTokenIfStale a permanent no-op
// with nothing to signal it. No new dependency needed for one field.
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue; // skip padding ("=") and anything stray
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

// Decodes a JWT's payload without verifying the signature — fine here since
// it only ever reads our own already-issued token's own "exp" claim for a
// client-side staleness check, never to authorize anything itself.
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split(".")[1];
    const bin = base64UrlDecode(part);
    const json = decodeURIComponent(
      bin.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// POST /auth/refresh (backend/internal/api/handlers/auth.go:282) re-signs a
// fresh 30-day token off the CURRENT token's own claims — auth.RefreshToken
// runs ValidateToken on it first, so this only ever succeeds while the
// current token is still unexpired. There's no separate refresh-token
// concept in this backend; the "refresh" is just "reissue before it dies."
// A plain axios.post (not the shared `api` instance) so this call is never
// itself intercepted by the 401 handler below — that would recurse.
//
// Concurrent callers (the proactive foreground check and a reactive 401
// both firing around the same moment) share one in-flight request instead
// of each POSTing their own.
let refreshInFlight: Promise<string | null> | null = null;
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const current = await getToken();
      if (!current) return null;
      const res = await axios.post(
        `${API_URL}/auth/refresh`,
        null,
        { headers: { Authorization: `Bearer ${current}` }, timeout: 8000 }
      );
      const newToken = res.data?.access_token;
      if (!newToken) return null;
      await setToken(newToken);
      return newToken as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Proactively renews the token once it's within REFRESH_MARGIN_MS of its
// 30-day expiry (cfg.JWTExpiration — backend/internal/config/config.go) —
// call this on app launch/foreground. This is what actually keeps an
// actively-used app from ever reaching the hard 30-day expiry; the
// interceptor's reactive refresh below can't help once a token has already
// expired (see the comment on refreshAccessToken), so without this an app
// that's only opened occasionally still gets logged out once 30 days pass.
// Safe to call often — no-ops unless the token is genuinely getting old, or
// missing/undecodable (nothing to refresh; the 401 path handles that case).
const REFRESH_MARGIN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days before expiry
export async function refreshTokenIfStale(): Promise<void> {
  const token = await getToken();
  if (!token) return;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return;
  const msRemaining = payload.exp * 1000 - Date.now();
  if (msRemaining < REFRESH_MARGIN_MS) {
    await refreshAccessToken();
  }
}

// Guards against every in-flight request that 401s at once each firing
// their own alert/redirect when a token expires mid-session.
let handling401 = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;

    // Try exactly one refresh-and-retry per original request before giving
    // up on it — _refreshAttempted is set on `original` (not a module-level
    // flag) so it's scoped per request, not global, and is already true by
    // the time a retried request's own failure re-enters this interceptor,
    // so that second failure falls straight through to the logout branch
    // below instead of refreshing again. This bounds it to at most one
    // retry per request; it can't loop.
    if (error?.response?.status === 401 && original && !original._refreshAttempted) {
      original._refreshAttempted = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
        return api.request(original);
      }
    }

    if (error?.response?.status === 401 && !handling401) {
      handling401 = true;
      await clearSession();
      Alert.alert(
        i18n.t("home.alerts.sessionExpiredTitle"),
        i18n.t("home.alerts.sessionExpiredMsg"),
        [{ text: i18n.t("common.ok"), onPress: () => router.replace("/(auth)/login" as any) }]
      );
      setTimeout(() => { handling401 = false; }, 1500);
    }
    return Promise.reject(error);
  }
);
