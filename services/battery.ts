import * as Battery from "expo-battery";

export const MIN_BATTERY_LEVEL = 0.15; // 15%

// Returns 0-1, or null if unreadable (never blocks the driver on error).
export const getBatteryLevel = async (): Promise<number | null> => {
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level == null || level < 0) return null;
    return level;
  } catch {
    return null;
  }
};

// Unknown battery state or a read error always resolves to "not too low" —
// a driver must never be blocked from accepting rides by a library failure.
export const isBatteryTooLow = async (): Promise<boolean> => {
  try {
    const level = await getBatteryLevel();
    if (level === null) return false;

    const state = await Battery.getBatteryStateAsync();
    const isCharging =
      state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    if (isCharging) return false;

    return level < MIN_BATTERY_LEVEL;
  } catch {
    return false;
  }
};
