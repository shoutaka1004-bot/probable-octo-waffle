export interface RoutePoint {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Bearing (0=N, 90=E, 180=S, 270=W) from point A to point B.
 */
export function calculateBearing(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const φ1 = toRad(fromLat);
  const φ2 = toRad(toLat);
  const Δλ = toRad(toLng - fromLng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Great-circle distance in meters between two coordinates (Haversine).
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns a coordinate `meters` north of the given position.
 * 1 degree latitude ≈ 111,320 m.
 */
export function addMetersNorth(
  lat: number,
  lng: number,
  meters: number
): { lat: number; lng: number } {
  return { lat: lat + meters / 111320, lng };
}

/**
 * Formats meters into a human-readable string.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Calculates a destination point given a start, bearing, and distance.
 * (Spherical Earth direct formula)
 */
function destinationPoint(
  lat: number,
  lng: number,
  distanceMeters: number,
  bearingDeg: number
): { lat: number; lng: number } {
  const R = 6371000;
  const δ = distanceMeters / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: ((λ2 * 180) / Math.PI + 540) % 360 - 180,
  };
}

/**
 * Generates a random destination within minMeters–maxMeters
 * in a random direction from the given coordinate.
 */
export function generateRandomDestination(
  lat: number,
  lng: number,
  minMeters = 500,
  maxMeters = 1000
): { lat: number; lng: number } {
  const distance = minMeters + Math.random() * (maxMeters - minMeters);
  const bearing = Math.random() * 360;
  return destinationPoint(lat, lng, distance, bearing);
}
