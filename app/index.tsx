import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Image, StyleSheet, ActivityIndicator, Animated, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import axios from "axios";
import { setDriverProperties } from "@/services/analytics";
import { requestPermissionsOnce } from "@/services/permissions";
import { clearSession, clearToken, getToken, migrateTokenIfNeeded } from "@/services/session";
import { useTranslation } from "react-i18next";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const FIRST_LAUNCH_KEY = "app_installed_flag";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Android Auto Backup (and iOS backups) can restore AsyncStorage on a fresh
// install, which would otherwise auto-login into the previous account. On
// first-ever launch there's no flag yet, so we wipe anything restored and
// mark the install as seen. Logout must never remove FIRST_LAUNCH_KEY.
async function checkFreshInstall() {
  try {
    const installedFlag = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!installedFlag) {
      await AsyncStorage.clear();
      await clearToken(); // SecureStore (Keychain on iOS) survives AsyncStorage.clear()
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "true");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function Index() {
  const router = useRouter();
  const { t } = useTranslation();
  const [fade] = useState(new Animated.Value(0));
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      requestPermissionsOnce(); // fire-and-forget, never blocks routing

      if (await checkFreshInstall()) {
        setTarget("/(auth)/login");
        await SplashScreen.hideAsync().catch(() => {});
        Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        return;
      }

      await migrateTokenIfNeeded();
      const t = await getToken();
      if (!t) {
        setTarget("/(auth)/login");
      } else {
        try {
          const profileRes = await axios.get(`${API}/gogoo/driver/profile`, {
            headers: { Authorization: `Bearer ${t}` },
            timeout: 6000,
          });
          const driverUser = await AsyncStorage.getItem("driver_user");
          const dUser = driverUser ? JSON.parse(driverUser) : null;
          if (profileRes.data?.driver_id) {
            setDriverProperties({
              id: profileRes.data.driver_id,
              name: dUser?.name,
              vehicleType: profileRes.data?.vehicle_type,
            });
          }
          setTarget("/(app)/home");
        } catch (e: any) {
          if (e.response?.status === 401) {
            await clearSession();
            setTarget("/(auth)/login");
          } else {
            // Network error or server down — token may be fine, go to home
            setTarget("/(app)/home");
          }
        }
      }
      await SplashScreen.hideAsync().catch(() => {});
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    })();
  }, []);

  useEffect(() => {
    if (!target) return;
    const timer = setTimeout(() => router.replace(target as any), 1100);
    return () => clearTimeout(timer);
  }, [target]);

  return (
    <View style={s.wrap}>
      <Animated.View style={{ opacity: fade, alignItems: "center" }}>
        <Image source={require("../assets/logo.png")} style={s.logo} resizeMode="contain" />
        <Text style={s.tag}>{t("auth.login.driverBadge")}</Text>
        <ActivityIndicator color="#FF6B2B" style={{ marginTop: 24 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  logo: { width: 260, height: 175 },
  tag: { marginTop: 6, color: "#FF6B2B", fontWeight: "900", fontSize: 14, letterSpacing: 4 },
});
