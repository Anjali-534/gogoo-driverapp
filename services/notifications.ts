import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getToken } from "./session";

const API = process.env.EXPO_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

// Show the OS alert (+ ring the custom sound) even while the app is in the
// foreground, so a ride request still rings if it arrives via push instead
// of the polling-driven in-app popup.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureRideRequestChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("ride-requests", {
    name: "Ride Requests",
    importance: Notifications.AndroidImportance.MAX,
    sound: "ride_request.wav",
    vibrationPattern: [0, 800, 400, 800],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

// Everything that ISN'T a ride request — announcements, referral credits,
// support replies, document review, etc. Normal importance/default sound,
// deliberately not urgent like the ride-requests channel above.
async function ensureGeneralChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("general", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

async function requestPushToken(): Promise<string | null> {
  try {
    await ensureRideRequestChannel();
    await ensureGeneralChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted" || !Device.isDevice) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    await AsyncStorage.setItem("expo_push_token", pushToken);
    return pushToken;
  } catch {
    return null;
  }
}

// Call on login and whenever the driver goes online, so the backend always
// has a fresh token to target for ride-request pushes.
export async function registerPushToken(): Promise<void> {
  const driverToken = await getToken();
  if (!driverToken) return;
  const pushToken = await requestPushToken();
  if (!pushToken) return;
  try {
    await axios.post(
      `${API}/gogoo/push-token`,
      { token: pushToken },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
  } catch {
    // Non-fatal — driver still gets in-app ringtone via polling while online.
  }
}
