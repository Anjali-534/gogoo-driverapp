import axios from "axios";
import { router } from "expo-router";
import { Alert } from "react-native";
import { clearSession, getToken } from "./session";
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

// Guards against every in-flight request that 401s at once each firing
// their own alert/redirect when a token expires mid-session.
let handling401 = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
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
