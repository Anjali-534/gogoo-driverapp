import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nextProvider } from "react-i18next";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { trackDriverInteraction } from "@/services/analytics";
import i18n, { initI18n } from "@/i18n";

// Held until initI18n() resolves so the app never flashes English before
// the persisted/device language is ready — see initI18n's own comment for
// why this must finish before the first render, not just before paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Handles https://<backend>/dr/<code> (path-based, from the referral
// landing page's universal link) and gogoodriver://referral?code=<code>
// (query-param based, from that same page's custom-scheme JS redirect —
// Linking.parse() puts "referral" in hostname and the code in queryParams
// for that form, not in path). Codes only apply at signup, so a logged-in
// driver's tap is a no-op.
async function handleReferralURL(url: string | null) {
  if (!url) return;
  try {
    const { path, queryParams } = Linking.parse(url);
    const pathMatch = /^\/?dr\/([A-Za-z0-9]+)/i.exec(path || "");
    const code = pathMatch?.[1] || (queryParams?.code as string | undefined);
    if (!code) return;
    const loggedIn = await AsyncStorage.getItem("driver_token");
    if (loggedIn) return;
    await AsyncStorage.setItem("pending_referral_code", code.toUpperCase());
  } catch {}
}

// Tapping a ride-request push (app backgrounded, or cold-started from a
// killed state) should land the driver on the home screen, where the
// existing polling/popup logic picks the booking up once it's in the
// pending-bookings feed.
//
// Every other push type (general channel — announcements, referral
// credits, document review, support replies, ticket status) lands on the
// Notifications screen by default; a support_reply with a ticket_id in its
// data payload jumps straight to that ticket's chat instead.
function handleNotificationTap(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined
) {
  if (data?.type === "ride_request") {
    router.push("/(app)/home" as any);
    return;
  }
  if (data?.type === "support_reply" && data?.ticket_id) {
    router.push({ pathname: "/(app)/support/chat" as any, params: { ticket_id: String(data.ticket_id) } });
    return;
  }
  if (data?.type) {
    router.push("/(app)/notifications" as any);
  }
}

export default function RootLayout() {
  const router = useRouter();
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    // Note: does NOT call SplashScreen.hideAsync() itself — app/index.tsx
    // owns splash-hide timing (it holds the splash through its own
    // auth-check + fade-in sequence). Hiding it here too would reveal
    // index.tsx's white background before its fade-in animation starts.
    initI18n()
      .catch(() => {}) // falls back to English inside initI18n itself
      .finally(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleReferralURL);
    const sub = Linking.addEventListener("url", ({ url }) => handleReferralURL(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    try {
      // Cold start: app was killed and opened by tapping the notification.
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const data = response?.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          handleNotificationTap(router, data);
        })
        .catch(() => {});

      // Warm/background start: app was already running.
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          handleNotificationTap(router, data);
        } catch {}
      });
      return () => { try { sub.remove(); } catch {} };
    } catch {
      // Notifications unavailable (e.g. Expo Go without a native build) —
      // in-app polling/ringtone still works while the app is foregrounded.
    }
  }, [router]);

  if (!i18nReady) return null; // splash screen is still held at this point

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={trackDriverInteraction}>
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
