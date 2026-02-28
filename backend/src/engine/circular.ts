/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 10-12
 * CIRCULAR ECONOMY MODULE
 *
 * ZERO AI. All math is deterministic.
 */

import { MATERIAL_EMISSION_FACTORS, LANDFILL_VOLUME_M3_PER_KG } from './constants';

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 10: Material Circularity Indicator (MCI)
// MCI = 1 - (Virgin / Total) × (Waste / TotalInput)
// Range: 0 (fully linear) to 1 (fully circular)
// ═══════════════════════════════════════════════════════════════

export interface MCIInput {
    virginMaterialKg: number;
    totalMaterialKg: number;
    wasteGeneratedKg: number;
    totalMaterialInputKg: number;
}

export function calculateMCI(input: MCIInput): {
    mci: number;
    formula: string;
    interpretation: string;
} {
    if (input.totalMaterialKg <= 0) throw new Error('totalMaterialKg must be > 0');
    if (input.totalMaterialInputKg <= 0) throw new Error('totalMaterialInputKg must be > 0');
    if (input.virginMaterialKg < 0) throw new Error('virginMaterialKg must be >= 0');
    if (input.wasteGeneratedKg < 0) throw new Error('wasteGeneratedKg must be >= 0');

    const virginRatio = input.virginMaterialKg / input.totalMaterialKg;
    const wasteRatio = input.wasteGeneratedKg / input.totalMaterialInputKg;
    const mci = Math.max(0, Math.min(1, round2(1 - virginRatio * wasteRatio)));

    const interpretation =
        mci >= 0.8 ? 'Highly circular — industry leader'
            : mci >= 0.5 ? 'Moderately circular — good progress'
                : mci >= 0.3 ? 'Low circularity — significant improvement needed'
                    : 'Very linear — urgent action needed';

    return {
        mci,
        formula: `MCI = 1 - (${input.virginMaterialKg}/${input.totalMaterialKg}) × (${input.wasteGeneratedKg}/${input.totalMaterialInputKg}) = ${mci}`,
        interpretation,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 11: Recycling Substitution Credit
// Credit_kg_CO2 = Q × (EF_virgin - EF_recycled)
// ═══════════════════════════════════════════════════════════════

export interface RecyclingCreditResult {
    co2CreditKg: number;
    waterSavedLiters: number;
    energySavedKwh: number;
    landfillAvoidedM3: number;
    formula: string;
    materialFactors: { virgin: number; recycled: number; credit: number };
}

export function calculateRecyclingCredit(
    materialType: string,
    quantityKg: number
): RecyclingCreditResult {
    if (quantityKg <= 0) throw new Error('quantityKg must be > 0');

    const factors = MATERIAL_EMISSION_FACTORS[materialType] || MATERIAL_EMISSION_FACTORS['mixed'];
    const co2CreditKg = round2(quantityKg * factors.credit);
    const waterSavedLiters = round2(quantityKg * factors.waterPerKg);
    const energySavedKwh = round2(quantityKg * factors.energyPerKg);
    const volumeFactor = LANDFILL_VOLUME_M3_PER_KG[materialType] || LANDFILL_VOLUME_M3_PER_KG['mixed'];
    const landfillAvoidedM3 = round2(quantityKg * volumeFactor);

    return {
        co2CreditKg,
        waterSavedLiters,
        energySavedKwh,
        landfillAvoidedM3,
        formula: `Credit = ${quantityKg} kg × (${factors.virgin} - ${factors.recycled}) = ${co2CreditKg} kg CO2`,
        materialFactors: { virgin: factors.virgin, recycled: factors.recycled, credit: factors.credit },
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 12: Industrial Symbiosis Efficiency
// ISE = (Exchanged / Generated) × (OptimalDist / ActualDist)
// ═══════════════════════════════════════════════════════════════

export function calculateISE(
    byproductExchangedKg: number,
    totalByproductKg: number,
    actualDistanceKm: number,
    optimalDistanceKm: number = 50
): { ise: number; formula: string; interpretation: string } {
    if (totalByproductKg <= 0) throw new Error('totalByproductKg must be > 0');
    if (actualDistanceKm <= 0) throw new Error('actualDistanceKm must be > 0');
    if (byproductExchangedKg < 0) throw new Error('byproductExchangedKg must be >= 0');

    const exchangeRatio = byproductExchangedKg / totalByproductKg;
    const distanceRatio = Math.min(1, optimalDistanceKm / actualDistanceKm);
    const ise = round2(Math.min(1, exchangeRatio * distanceRatio));

    const interpretation =
        ise >= 0.8 ? 'Excellent symbiosis efficiency'
            : ise >= 0.5 ? 'Good efficiency — consider closer partners'
                : ise >= 0.3 ? 'Moderate — explore local exchange networks'
                    : 'Poor — significant opportunity for improvement';

    return {
        ise,
        formula: `ISE = (${byproductExchangedKg}/${totalByproductKg}) × (${optimalDistanceKm}/${actualDistanceKm}) = ${ise}`,
        interpretation,
    };
}

// ═══════════════════════════════════════════════════════════════
// BONUS: Circularity Rate (simplified)
// ═══════════════════════════════════════════════════════════════

export function calculateCircularityRate(
    wasteGeneratedKg: number,
    wasteExchangedKg: number,
    wasteRecycledKg: number
): number {
    if (wasteGeneratedKg <= 0) return 0;
    const diverted = wasteExchangedKg + wasteRecycledKg;
    return round2(Math.min(100, (diverted / wasteGeneratedKg) * 100));
}
