// Cached-position-first location for "Go online". expo-location's
// getCurrentPositionAsync (Balanced) discards any fix older than 3s and
// waits with no time limit, so toggling online used to block on a brand-new
// fix even while the orders screen's GPS watch already knew where the
// driver was. That watch now records into this cache (rememberPosition).
import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };

// A position this recent (from the orders watch or an earlier toggle) is
// used as-is.
const REUSE_MAX_AGE_MS = 60_000;
// The OS's last-known position is accepted up to this age, then refreshed
// in the background. Tighter than the rider app's 10 min: the go-online
// position is what dispatch matches against until the next location push.
const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;

let latest: (Coords & { at: number }) | null = null;

export function rememberPosition(lat: number, lng: number, at = Date.now()) {
  if (!latest || at >= latest.at) latest = { lat, lng, at };
}

export async function freshPosition(): Promise<Coords | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    rememberPosition(pos.coords.latitude, pos.coords.longitude);
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * The fastest trustworthy position: a recent cached one, else the OS's
 * last-known (stale = true — the caller should refresh it in the
 * background), else a fresh fix. Assumes permission is already granted.
 */
export async function quickPosition(): Promise<{ coords: Coords; stale: boolean } | null> {
  if (latest && Date.now() - latest.at <= REUSE_MAX_AGE_MS) {
    return { coords: { lat: latest.lat, lng: latest.lng }, stale: false };
  }
  try {
    const pos = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    if (pos) {
      rememberPosition(pos.coords.latitude, pos.coords.longitude, pos.timestamp);
      return { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, stale: true };
    }
  } catch {}
  const f = await freshPosition();
  return f ? { coords: f, stale: false } : null;
}
