// One-shot handoff of a just-accepted ride from Home's ride-request popup to
// the Orders screen, so Orders can show the active-ride map immediately from
// data it already has instead of first re-discovering the booking with two
// sequential round-trips (/driver/active-booking, then /bookings/:id).
// Orders refreshes the full booking in the background right after.

type AcceptedRide = { bookingId: string; booking: any };

let pending: AcceptedRide | null = null;

export function setAcceptedRide(bookingId: string, booking: any) {
  pending = { bookingId, booking };
}

// Returns the handoff at most once, then clears it.
export function takeAcceptedRide(): AcceptedRide | null {
  const r = pending;
  pending = null;
  return r;
}
