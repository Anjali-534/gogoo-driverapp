import AsyncStorage from "@react-native-async-storage/async-storage";

// Every AsyncStorage key that identifies a specific driver or their in-app
// session. Cleared together on logout/401 so a shared/handed-down device
// never leaks the previous driver's token, PII, or in-progress state to
// whoever logs in next.
const SESSION_KEYS = [
  "driver_token",
  "driver_user",
  "driver_id",
  "emergency_contact",
  "expo_push_token",
  "driver_signup_data",
  "pending_referral_code",
];

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(SESSION_KEYS);
}
