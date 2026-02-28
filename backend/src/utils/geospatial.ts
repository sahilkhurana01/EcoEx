/**
 * Geospatial utility functions
 */

/**
 * Calculate distance between two points using the Haversine formula
 * @param coord1 [longitude, latitude]
 * @param coord2 [longitude, latitude]
 * @returns distance in kilometers
 */
export function calculateDistance(coord1: number[], coord2: number[]): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coord2[1] - coord1[1]);
    const dLon = toRad(coord2[0] - coord1[0]);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1[1])) * Math.cos(toRad(coord2[1])) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(value: number): number {
    return (value * Math.PI) / 180;
}

/**
 * Create a GeoJSON point object
 */
export function createGeoPoint(longitude: number, latitude: number) {
    return {
        type: 'Point' as const,
        coordinates: [longitude, latitude],
    };
}

/**
 * Estimate transport cost in INR based on distance
 * ~₹35 per km for truck transport (India average)
 */
export function estimateTransportCost(distanceKm: number): number {
    return Math.round(distanceKm * 35);
}

/**
 * Estimate transport emissions
 * @returns kg CO2 for truck transport
 */
export function estimateTransportEmissions(distanceKm: number, weightTons: number): number {
    const TRUCK_EMISSION_PER_TON_KM = 0.062; // kg CO2
    return Math.round(distanceKm * weightTons * TRUCK_EMISSION_PER_TON_KM * 100) / 100;
}
