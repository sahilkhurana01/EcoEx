/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — HARDCODED CONSTANTS
 * Source: EPA WARM Model, IPCC AR5, India MOEFCC, BEE India
 * ZERO AI — All values are deterministic and auditable.
 */

// ═══════════════════════════════════════════════════════════════
// GRID EMISSION FACTORS (kg CO2 / kWh)
// ═══════════════════════════════════════════════════════════════
export const GRID_EMISSION_FACTORS: Record<string, number> = {
    coal_heavy: 0.82,        // Punjab, UP, Jharkhand (coal-dominant grids)
    mixed: 0.71,            // India national average (CEA 2023)
    renewable_heavy: 0.25,  // Karnataka, Kerala (hydro/solar-dominant)
    global_average: 0.48,   // IEA world average
    unknown: 0.71,          // Default to India national average
};

// ═══════════════════════════════════════════════════════════════
// FUEL EMISSION FACTORS (pre-calculated direct factors)
// ═══════════════════════════════════════════════════════════════

/** kg CO2 per liter of liquid fuel */
export const LIQUID_FUEL_FACTORS: Record<string, number> = {
    diesel: 2.68,   // Density 0.832 × NCV 43.0 × EF 74.1 / 1000 × OxF 0.99
    petrol: 2.31,   // Density 0.745 × NCV 44.3 × EF 69.3 / 1000 × OxF 0.99
    lpg: 1.51,      // Density 0.54 × NCV 47.3 × EF 63.1 / 1000 × OxF 0.995
};

/** kg CO2 per kg of solid/gaseous fuel */
export const MASS_FUEL_FACTORS: Record<string, number> = {
    natural_gas: 2.75,    // CH4: Carbon fraction 0.75 × (44/12) × Combustion eff 1.0
    naturalGas: 2.75,     // Alias
    coal: 2.86,           // Sub-bituminous: NCV 19.5 × EF 96.7 / 1000 × (1 - 0.15 ash)
};

// ═══════════════════════════════════════════════════════════════
// WASTE & METHANE CONSTANTS (IPCC)
// ═══════════════════════════════════════════════════════════════

/** Landfill methane generation (India managed landfills) */
export const LANDFILL_CONSTANTS = {
    DOC: 0.15,                     // Degradable Organic Carbon fraction
    DOC_FRACTION: 0.5,             // Fraction of DOC that decomposes
    F_CH4: 0.5,                    // Fraction of CH4 in landfill gas
    MOLECULAR_RATIO_CH4_C: 16 / 12, // 1.3333
    MCF: 1.0,                       // Methane Correction Factor (managed anaerobic)
    RECOVERY: 0.1,                   // 10% gas captured
    GWP_CH4: 25,                    // 100-year Global Warming Potential
    OXIDATION_FACTOR: 0.1,          // 10% oxidized in cover layer
};

/** Pre-calculated: kg CH4 per kg organic waste */
export const CH4_PER_KG_ORGANIC_WASTE =
    LANDFILL_CONSTANTS.DOC *
    LANDFILL_CONSTANTS.DOC_FRACTION *
    LANDFILL_CONSTANTS.F_CH4 *
    LANDFILL_CONSTANTS.MOLECULAR_RATIO_CH4_C *
    LANDFILL_CONSTANTS.MCF *
    (1 - LANDFILL_CONSTANTS.RECOVERY); // ≈ 0.045 kg CH4/kg

/** Pre-calculated: kg CO2e per kg organic waste (landfill methane) */
export const CO2E_PER_KG_ORGANIC_LANDFILL =
    CH4_PER_KG_ORGANIC_WASTE *
    LANDFILL_CONSTANTS.GWP_CH4 *
    (1 - LANDFILL_CONSTANTS.OXIDATION_FACTOR); // ≈ 1.0125 kg CO2e/kg

// ═══════════════════════════════════════════════════════════════
// RECYCLING SUBSTITUTION CREDITS (kg CO2 per kg material)
// ═══════════════════════════════════════════════════════════════
export const MATERIAL_EMISSION_FACTORS: Record<string, {
    virgin: number;
    recycled: number;
    credit: number;
    waterPerKg: number;      // liters per kg
    energyPerKg: number;     // kWh per kg
    densityKgPerM3: number;  // for volume conversions
}> = {
    steel: {
        virgin: 2.0, recycled: 0.5, credit: 1.5,
        waterPerKg: 20, energyPerKg: 5.5, densityKgPerM3: 7800,
    },
    metal_scrap: {
        virgin: 2.0, recycled: 0.5, credit: 1.5,
        waterPerKg: 20, energyPerKg: 5.5, densityKgPerM3: 7800,
    },
    aluminum: {
        virgin: 11.0, recycled: 0.5, credit: 10.5,
        waterPerKg: 30, energyPerKg: 14.0, densityKgPerM3: 2700,
    },
    plastic: {
        virgin: 2.5, recycled: 0.7, credit: 1.8,
        waterPerKg: 10, energyPerKg: 2.0, densityKgPerM3: 950,
    },
    paper: {
        virgin: 0.9, recycled: 0.3, credit: 0.6,
        waterPerKg: 15, energyPerKg: 3.0, densityKgPerM3: 700,
    },
    glass: {
        virgin: 0.85, recycled: 0.4, credit: 0.45,
        waterPerKg: 8, energyPerKg: 1.5, densityKgPerM3: 2500,
    },
    fabric: {
        virgin: 5.5, recycled: 1.2, credit: 4.3,
        waterPerKg: 100, energyPerKg: 10.0, densityKgPerM3: 400,
    },
    wood: {
        virgin: 0.45, recycled: 0.15, credit: 0.3,
        waterPerKg: 5, energyPerKg: 0.5, densityKgPerM3: 500,
    },
    chemical: {
        virgin: 3.0, recycled: 1.0, credit: 2.0,
        waterPerKg: 25, energyPerKg: 4.0, densityKgPerM3: 1200,
    },
    electronic: {
        virgin: 20.0, recycled: 5.0, credit: 15.0,
        waterPerKg: 50, energyPerKg: 25.0, densityKgPerM3: 2000,
    },
    construction: {
        virgin: 0.1, recycled: 0.03, credit: 0.07,
        waterPerKg: 2, energyPerKg: 0.2, densityKgPerM3: 2300,
    },
    organic: {
        virgin: 0.5, recycled: 0.1, credit: 0.4,
        waterPerKg: 5, energyPerKg: 0.3, densityKgPerM3: 600,
    },
    mixed: {
        virgin: 1.8, recycled: 0.6, credit: 1.2,
        waterPerKg: 15, energyPerKg: 3.5, densityKgPerM3: 1000,
    },
};

// ═══════════════════════════════════════════════════════════════
// TRANSPORT EMISSION FACTORS (kg CO2 per km)
// ═══════════════════════════════════════════════════════════════
export const TRANSPORT_FACTORS: Record<string, number> = {
    light_truck: 0.12,    // < 3.5 ton
    heavy_truck: 0.18,    // > 3.5 ton
    truck: 0.15,          // Generic average
    rail: 0.02,           // Rail freight
    ship: 0.01,           // Coastal shipping
    pipeline: 0.005,      // Pipeline transport
    air: 0.60,            // Air cargo
};

// ═══════════════════════════════════════════════════════════════
// MATCHING ALGORITHM WEIGHTS
// ═══════════════════════════════════════════════════════════════
export const DEFAULT_MATCH_WEIGHTS = {
    materialCompatibility: 0.40,
    quantityFit: 0.20,
    priceCompatibility: 0.20,
    distanceScore: 0.10,
    reliabilityScore: 0.10,
};

// ═══════════════════════════════════════════════════════════════
// EARTH CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const EARTH_RADIUS_KM = 6371;

// ═══════════════════════════════════════════════════════════════
// PREDICTIVE ANALYTICS CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const SMOOTHING_FACTORS = {
    stable: 0.3,
    volatile: 0.7,
};
export const Z_SCORE_95 = 1.96;

// ═══════════════════════════════════════════════════════════════
// WASTE INCINERATION FACTORS (kg CO2 / kg waste)
// ═══════════════════════════════════════════════════════════════
export const INCINERATION_FACTORS: Record<string, number> = {
    plastic: 2.3,
    paper: 1.2,
    wood: 1.8,
    organic: 0.4,
    fabric: 2.0,
    mixed: 1.5,
    electronic: 0.8,
    chemical: 2.5,
};

// Landfill volume: m³ per kg (inverse of compacted density)
export const LANDFILL_VOLUME_M3_PER_KG: Record<string, number> = {
    metal_scrap: 0.0003,
    steel: 0.0003,
    plastic: 0.002,
    organic: 0.0015,
    fabric: 0.003,
    wood: 0.002,
    chemical: 0.001,
    electronic: 0.001,
    construction: 0.0005,
    glass: 0.0005,
    paper: 0.002,
    mixed: 0.0012,
};
