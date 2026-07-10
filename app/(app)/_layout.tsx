import { useEffect } from "react";
import { AppState } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import {
  useScreenTimeTracker,
  startDriverSession,
  endDriverSession,
  trackDriverAppOpened,
  trackUsagePattern,
} from "@/services/analytics";

export default function AppLayout() {
  const { t } = useTranslation();
  useScreenTimeTracker(); // automatic screen time + view tracking on every navigation

  useEffect(() => {
    const init = async () => {
      try {
        const driverId = await AsyncStorage.getItem("driver_id");
        if (driverId) {
          await startDriverSession(driverId);
          await trackDriverAppOpened(driverId);
        }
      } catch {}
    };
    init();

    const sub = AppState.addEventListener("change", async (state) => {
      try {
        const driverId = await AsyncStorage.getItem("driver_id");
        if (state === "active" && driverId) {
          await startDriverSession(driverId);
          await trackUsagePattern();
        } else if (state === "background") {
          await endDriverSession();
        }
      } catch {}
    });

    return () => sub.remove();
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#EFEFEF", borderTopWidth: 1, height: 62, paddingBottom: 8, paddingTop: 6 },
      tabBarActiveTintColor: "#FF6B2B",
      tabBarInactiveTintColor: "#AEAEAE",
      tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
    }}>
      <Tabs.Screen name="home/index"       options={{ title: t("common.tabs.home"),     tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home"          : "home-outline"}          size={size ?? 22} color={color} /> }} />
      <Tabs.Screen name="orders/index"     options={{ title: t("common.tabs.orders"),   tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "list"          : "list-outline"}          size={size ?? 22} color={color} /> }} />
      <Tabs.Screen name="earnings/index"   options={{ title: t("common.tabs.earnings"), tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "wallet"        : "wallet-outline"}        size={size ?? 22} color={color} /> }} />
      <Tabs.Screen name="documents/index"  options={{ title: t("common.tabs.docs"),     tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "document-text" : "document-text-outline"} size={size ?? 22} color={color} /> }} />
      <Tabs.Screen name="profile/index"    options={{ title: t("common.tabs.profile"),  tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person"        : "person-outline"}        size={size ?? 22} color={color} /> }} />

      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="orders/chat"         options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="profile/ledger"      options={{ href: null }} />
      <Tabs.Screen name="profile/refer"       options={{ href: null }} />
      <Tabs.Screen name="profile/payments"    options={{ href: null }} />
      <Tabs.Screen name="profile/edit"        options={{ href: null }} />
      <Tabs.Screen name="profile/settings"    options={{ href: null }} />
      <Tabs.Screen name="profile/training"    options={{ href: null }} />
      <Tabs.Screen name="profile/privacy"     options={{ href: null }} />
      <Tabs.Screen name="profile/terms"       options={{ href: null }} />
      <Tabs.Screen name="profile/help"        options={{ href: null }} />
      <Tabs.Screen name="profile/contact"     options={{ href: null }} />
      <Tabs.Screen name="support/index"       options={{ href: null }} />
      <Tabs.Screen name="support/chat"        options={{ href: null }} />
      <Tabs.Screen name="support/new"         options={{ href: null }} />
    </Tabs>
  );
}
