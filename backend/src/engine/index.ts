/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — UNIFIED API
 * 25 Hardcoded Formulas. ZERO AI Math.
 *
 * Modules:
 *   emissions  → Formulas 1-9   (Carbon + Waste)
 *   circular   → Formulas 10-12 (MCI, Credits, ISE)
 *   transport  → Formulas 13-15 (Haversine, Vehicle, Route)
 *   matching   → Formulas 16-19 (Scoring, Price, Distance, Quantity)
 *   predictive → Formulas 20-22 (Smoothing, CI, Regression)
 *   economic   → Formulas 23-25 (CAC, IRR, Eco-efficiency)
 */

// Carbon & Waste (F1-F9)
export {
    calculateElectricityEmissions,
    calculateLiquidFuelEmissions,
    calculateGaseousFuelEmissions,
    calculateCoalEmissions,
    calculateTotalCarbon,
    calculateCarbonIntensity,
    calculateLandfillMethane,
    methaneToCo2e,
    calculateIncinerationEmissions,
} from './emissions';

// Circular Economy (F10-F12)
export {
    calculateMCI,
    calculateRecyclingCredit,
    calculateISE,
    calculateCircularityRate,
} from './circular';

// Transport (F13-F15)
export {
    haversineDistance,
    calculateVehicleEmissions,
    calculateRouteSavings,
    estimateTransport,
} from './transport';

// Matching (F16-F19)
export {
    calculateWeightedMatchScore,
    calculatePriceScore,
    calculateDistanceScore,
    calculateQuantityFit,
    calculateMaterialCompatibility,
} from './matching';

// Predictive (F20-F22)
export {
    exponentialSmoothing,
    calculateConfidenceInterval,
    linearRegression,
} from './predictive';

// Economic (F23-F25)
export {
    calculateAbatementCost,
    calculateIRR,
    calculateEcoEfficiency,
} from './economic';

// Constants
export * from './constants';
