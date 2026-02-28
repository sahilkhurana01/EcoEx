/**
 * EPA / IPCC Emission Factors for India Context (2024)
 * All values in kg CO2 equivalent unless otherwise noted
 */

// Electricity grid emission factor (India average) — kg CO2 per kWh
export const GRID_EMISSION_FACTOR_INDIA = 0.82; // CEA 2023-24

// Fuel emission factors — kg CO2 per unit
export const FUEL_EMISSION_FACTORS = {
    diesel: 2.68,        // kg CO2 per liter
    petrol: 2.31,        // kg CO2 per liter
    lpg: 1.51,           // kg CO2 per liter
    naturalGas: 2.75,    // kg CO2 per kg
    coal: 2.42,          // kg CO2 per kg
} as const;

// Water treatment emission — kg CO2 per 1000 liters
export const WATER_EMISSION_FACTOR = 0.344;

// Transport emission — kg CO2 per ton-km
export const TRANSPORT_EMISSION_FACTORS = {
    truck: 0.062,
    rail: 0.022,
    ship: 0.008,
    pipeline: 0.005,
} as const;

// Virgin material production emission factors — kg CO2 per kg of material
export const VIRGIN_MATERIAL_EMISSIONS = {
    metal_scrap: 2.1,       // steel from iron ore
    plastic: 3.5,           // virgin plastic production
    organic: 0.5,           // composting vs landfill methane
    fabric: 5.5,            // cotton/polyester mix
    wood: 0.9,              // lumber processing
    chemical: 2.8,          // chemical manufacturing
    electronic: 20.0,       // e-waste components
    construction: 0.4,      // concrete/aggregate
    mixed: 1.5,             // average mixed waste
    energy_recovery: 0.8,   // waste-to-energy
} as const;

// Recycling efficiency (kg CO2 saved per kg recycled vs virgin)
export const RECYCLING_SAVINGS = {
    metal_scrap: 1.67,    // 80% of virgin
    plastic: 2.1,         // 60% of virgin
    organic: 0.45,        // composting methane avoidance
    fabric: 3.3,          // 60% of virgin
    wood: 0.54,           // 60% of virgin
    chemical: 1.4,        // 50% of virgin
    electronic: 15.0,     // 75% of virgin (precious metals)
    construction: 0.28,   // 70% of virgin
    mixed: 0.75,          // 50% of virgin
    energy_recovery: 0.5, // energy offset
} as const;

// Water savings per kg of recycled material (liters)
export const WATER_SAVINGS_PER_KG = {
    metal_scrap: 40,
    plastic: 90,
    organic: 5,
    fabric: 200,
    wood: 15,
    chemical: 60,
    electronic: 120,
    construction: 3,
    mixed: 20,
    energy_recovery: 2,
} as const;

// Landfill volume per kg (cubic meters per kg)
export const LANDFILL_VOLUME_PER_KG = {
    metal_scrap: 0.0002,
    plastic: 0.003,
    organic: 0.001,
    fabric: 0.004,
    wood: 0.002,
    chemical: 0.0005,
    electronic: 0.001,
    construction: 0.0006,
    mixed: 0.0015,
    energy_recovery: 0.0008,
} as const;

// Energy savings per kg recycled (kWh)
export const ENERGY_SAVINGS_PER_KG = {
    metal_scrap: 5.5,
    plastic: 5.7,
    organic: 0.3,
    fabric: 7.0,
    wood: 1.2,
    chemical: 3.0,
    electronic: 25.0,
    construction: 0.5,
    mixed: 2.0,
    energy_recovery: 1.5,
} as const;

// Material categories
export const MATERIAL_CATEGORIES = [
    'metal_scrap', 'plastic', 'organic', 'fabric', 'wood',
    'chemical', 'electronic', 'construction', 'mixed', 'energy_recovery',
] as const;

// Industry types
export const INDUSTRY_TYPES = [
    'steel', 'textile', 'food_processing', 'chemical',
    'construction', 'automotive', 'pharma', 'other',
] as const;

// Revenue ranges
export const REVENUE_RANGES = ['<1cr', '1-10cr', '10-50cr', '50-100cr', '>100cr'] as const;
