/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 13-15
 * TRANSPORT MODULE
 *
 * ZERO AI. Haversine + vehicle emissions are hardcoded.
 */

import { EARTH_RADIUS_KM, TRANSPORT_FACTORS } from './constants';

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 13: Haversine Distance (Great Circle)
// d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ1)cos(φ2)sin²(Δλ/2)))
// ═══════════════════════════════════════════════════════════════

export function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): { distanceKm: number; formula: string } {
    // Validate coordinates
    if (lat1 < -90 || lat1 > 90) throw new Error(`lat1 out of range: ${lat1}`);
    if (lat2 < -90 || lat2 > 90) throw new Error(`lat2 out of range: ${lat2}`);
    if (lon1 < -180 || lon1 > 180) throw new Error(`lon1 out of range: ${lon1}`);
    if (lon2 < -180 || lon2 > 180) throw new Error(`lon2 out of range: ${lon2}`);

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.asin(Math.sqrt(a));
    const distanceKm = round2(EARTH_RADIUS_KM * c);

    return {
        distanceKm,
        formula: `d = 2 × ${EARTH_RADIUS_KM} × arcsin(√(sin²(${round2(Δφ / 2)}) + cos(${round2(φ1)})cos(${round2(φ2)})sin²(${round2(Δλ / 2)}))) = ${distanceKm} km`,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 14: Vehicle Emissions
// CO2_kg = Distance_km × EF_per_km × Load_Factor
// ═══════════════════════════════════════════════════════════════

export interface VehicleEmissionsInput {
    distanceKm: number;
    vehicleType: string;  // truck | heavy_truck | light_truck | rail | ship | pipeline | air
    loadFactor?: number;  // 0.6 to 1.0 (capacity utilization)
}

export interface VehicleEmissionsResult {
    co2Kg: number;
    distanceKm: number;
    emissionFactor: number;
    loadFactor: number;
    vehicleType: string;
    formula: string;
}

export function calculateVehicleEmissions(input: VehicleEmissionsInput): VehicleEmissionsResult {
    if (input.distanceKm <= 0) throw new Error('distanceKm must be > 0');

    const loadFactor = input.loadFactor ?? 1.0;
    if (loadFactor < 0.1 || loadFactor > 1.5) throw new Error('loadFactor must be 0.1-1.5');

    const ef = TRANSPORT_FACTORS[input.vehicleType];
    if (ef === undefined) {
        throw new Error(`Unknown vehicle type: ${input.vehicleType}. Valid: ${Object.keys(TRANSPORT_FACTORS).join(', ')}`);
    }

    const co2Kg = input.distanceKm * ef * loadFactor;

    return {
        co2Kg: round2(co2Kg),
        distanceKm: input.distanceKm,
        emissionFactor: ef,
        loadFactor,
        vehicleType: input.vehicleType,
        formula: `CO2 = ${input.distanceKm} km × ${ef} kg/km × ${loadFactor} LF = ${round2(co2Kg)} kg`,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 15: Route Optimization Savings
// Savings = (D_original - D_optimized) × EF × Annual_Trips
// ═══════════════════════════════════════════════════════════════

export function calculateRouteSavings(
    originalDistanceKm: number,
    optimizedDistanceKm: number,
    vehicleType: string,
    annualTrips: number,
    loadFactor: number = 1.0
): {
    savingsCo2Kg: number;
    distanceSavedKm: number;
    percentageSaved: number;
    formula: string;
} {
    if (originalDistanceKm <= 0) throw new Error('originalDistanceKm must be > 0');
    if (optimizedDistanceKm <= 0) throw new Error('optimizedDistanceKm must be > 0');
    if (optimizedDistanceKm >= originalDistanceKm) {
        throw new Error('optimizedDistanceKm must be < originalDistanceKm');
    }
    if (annualTrips <= 0) throw new Error('annualTrips must be > 0');

    const ef = TRANSPORT_FACTORS[vehicleType] || TRANSPORT_FACTORS['truck'];
    const distanceSaved = originalDistanceKm - optimizedDistanceKm;
    const savingsCo2Kg = distanceSaved * ef * loadFactor * annualTrips;
    const percentageSaved = (distanceSaved / originalDistanceKm) * 100;

    return {
        savingsCo2Kg: round2(savingsCo2Kg),
        distanceSavedKm: round2(distanceSaved),
        percentageSaved: round2(percentageSaved),
        formula: `Savings = (${originalDistanceKm} - ${optimizedDistanceKm}) × ${ef} × ${loadFactor} × ${annualTrips} trips = ${round2(savingsCo2Kg)} kg CO2/year`,
    };
}

// ═══════════════════════════════════════════════════════════════
// COMBINED: Transport cost + emissions estimate
// ═══════════════════════════════════════════════════════════════

export function estimateTransport(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
    vehicleType: string = 'truck',
    loadFactor: number = 1.0,
    costPerKm: number = 5.0 // INR per km default
): {
    distanceKm: number;
    co2Kg: number;
    estimatedCostINR: number;
    formula: string;
} {
    const dist = haversineDistance(lat1, lon1, lat2, lon2);

    // Road distance ≈ 1.3× great circle (route factor)
    const roadDistanceKm = round2(dist.distanceKm * 1.3);

    const emissions = calculateVehicleEmissions({
        distanceKm: roadDistanceKm,
        vehicleType,
        loadFactor,
    });

    const estimatedCostINR = round2(roadDistanceKm * costPerKm);

    return {
        distanceKm: roadDistanceKm,
        co2Kg: emissions.co2Kg,
        estimatedCostINR,
        formula: `Distance: ${dist.distanceKm} km (air) → ${roadDistanceKm} km (road) | CO2: ${emissions.co2Kg} kg | Cost: ₹${estimatedCostINR}`,
    };
}
