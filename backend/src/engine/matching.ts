/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 16-19
 * MATCHING ALGORITHM MODULE
 *
 * ZERO AI. Scoring is pure math.
 */

import { DEFAULT_MATCH_WEIGHTS } from './constants';

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 16: Weighted Match Score
// Score = Σ(wi × fi) where Σwi = 1
// ═══════════════════════════════════════════════════════════════

export interface MatchFactors {
    materialCompatibility: number; // 0-100
    quantityFit: number;          // 0-100
    priceCompatibility: number;   // 0-100
    distanceScore: number;        // 0-100
    reliabilityScore: number;     // 0-100
}

export interface MatchWeights {
    materialCompatibility?: number;
    quantityFit?: number;
    priceCompatibility?: number;
    distanceScore?: number;
    reliabilityScore?: number;
}

export function calculateWeightedMatchScore(
    factors: MatchFactors,
    customWeights?: MatchWeights
): { score: number; formula: string; weightedFactors: Record<string, number> } {
    const w = {
        materialCompatibility: customWeights?.materialCompatibility ?? DEFAULT_MATCH_WEIGHTS.materialCompatibility,
        quantityFit: customWeights?.quantityFit ?? DEFAULT_MATCH_WEIGHTS.quantityFit,
        priceCompatibility: customWeights?.priceCompatibility ?? DEFAULT_MATCH_WEIGHTS.priceCompatibility,
        distanceScore: customWeights?.distanceScore ?? DEFAULT_MATCH_WEIGHTS.distanceScore,
        reliabilityScore: customWeights?.reliabilityScore ?? DEFAULT_MATCH_WEIGHTS.reliabilityScore,
    };

    // Validate weights sum to 1
    const weightSum = w.materialCompatibility + w.quantityFit + w.priceCompatibility + w.distanceScore + w.reliabilityScore;
    if (Math.abs(weightSum - 1.0) > 0.01) {
        throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
    }

    // Validate factors in 0-100 range
    for (const [key, val] of Object.entries(factors)) {
        if (val < 0 || val > 100) throw new Error(`${key} must be 0-100, got ${val}`);
    }

    const wf = {
        materialCompatibility: factors.materialCompatibility * w.materialCompatibility,
        quantityFit: factors.quantityFit * w.quantityFit,
        priceCompatibility: factors.priceCompatibility * w.priceCompatibility,
        distanceScore: factors.distanceScore * w.distanceScore,
        reliabilityScore: factors.reliabilityScore * w.reliabilityScore,
    };

    const score = round1(
        wf.materialCompatibility + wf.quantityFit + wf.priceCompatibility + wf.distanceScore + wf.reliabilityScore
    );

    return {
        score: clamp(score, 0, 100),
        formula: `Score = ${factors.materialCompatibility}×${w.materialCompatibility} + ${factors.quantityFit}×${w.quantityFit} + ${factors.priceCompatibility}×${w.priceCompatibility} + ${factors.distanceScore}×${w.distanceScore} + ${factors.reliabilityScore}×${w.reliabilityScore} = ${score}`,
        weightedFactors: wf,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 17: Price Compatibility Score
// Score = 100 × (1 - |Listed - BudgetMid| / BudgetMid)
// Bonus if listed ≤ budget max
// ═══════════════════════════════════════════════════════════════

export function calculatePriceScore(
    listedPrice: number,
    budgetMin: number,
    budgetMax: number
): { score: number; formula: string } {
    if (listedPrice < 0) throw new Error('listedPrice must be >= 0');
    if (budgetMax <= 0) throw new Error('budgetMax must be > 0');

    // Free material = perfect price
    if (listedPrice === 0) {
        return { score: 100, formula: 'Free material → Score = 100' };
    }

    const budgetMid = (budgetMin + budgetMax) / 2;
    if (budgetMid <= 0) {
        return { score: listedPrice === 0 ? 100 : 0, formula: 'Budget = 0 → Score = 0' };
    }

    let score: number;
    if (listedPrice <= budgetMax) {
        // Within budget — bonus for being cheaper
        score = Math.min(100, 100 * (1 + (budgetMax - listedPrice) / budgetMax));
    } else {
        // Over budget — penalize proportionally
        score = 100 * (1 - Math.abs(listedPrice - budgetMid) / budgetMid);
    }

    score = clamp(round1(score), 0, 100);

    return {
        score,
        formula: `PriceScore(listed=${listedPrice}, budget=${budgetMin}-${budgetMax}) = ${score}`,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 18: Distance Score
// Near = 100, Far = penalized, Beyond max = steep dropoff
// ═══════════════════════════════════════════════════════════════

export function calculateDistanceScore(
    distanceKm: number,
    maxAcceptableKm: number
): { score: number; formula: string } {
    if (distanceKm < 0) throw new Error('distanceKm must be >= 0');
    if (maxAcceptableKm <= 0) throw new Error('maxAcceptableKm must be > 0');

    let score: number;

    if (distanceKm <= 0.5 * maxAcceptableKm) {
        // Very close — perfect score
        score = 100;
    } else if (distanceKm <= maxAcceptableKm) {
        // Within range — linear decrease from 100 to 50
        score = 100 * (1 - 0.5 * (distanceKm - 0.5 * maxAcceptableKm) / (0.5 * maxAcceptableKm));
    } else {
        // Beyond max — steep penalty but not zero immediately
        score = Math.max(0, 100 * (1.2 - distanceKm / maxAcceptableKm));
    }

    score = clamp(round1(score), 0, 100);

    return {
        score,
        formula: `DistScore(${distanceKm}km / max ${maxAcceptableKm}km) = ${score}`,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 19: Quantity Fit Score
// Base = min(Listed/Required, 1.0) × 100
// Bonus if excess (up to 20 extra points, capped at 100)
// ═══════════════════════════════════════════════════════════════

export function calculateQuantityFit(
    listedQuantity: number,
    requiredQuantityMin: number,
    requiredQuantityMax: number
): { score: number; formula: string } {
    if (listedQuantity <= 0) throw new Error('listedQuantity must be > 0');
    if (requiredQuantityMin <= 0) throw new Error('requiredQuantityMin must be > 0');

    const requiredMid = (requiredQuantityMin + requiredQuantityMax) / 2;
    let score: number;

    if (listedQuantity >= requiredQuantityMin && listedQuantity <= requiredQuantityMax) {
        // Perfect fit
        score = 100;
    } else if (listedQuantity < requiredQuantityMin) {
        // Under — proportional decrease
        score = (listedQuantity / requiredQuantityMin) * 100;
    } else {
        // Over — slight bonus (surplus is good, but not too much)
        const base = 100;
        const bonus = Math.min(20, 10 * (1 - requiredMid / listedQuantity));
        score = Math.min(100, base + bonus);
    }

    score = clamp(round1(score), 0, 100);

    return {
        score,
        formula: `QtyFit(listed=${listedQuantity}, needed=${requiredQuantityMin}-${requiredQuantityMax}) = ${score}`,
    };
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL COMPATIBILITY (category matching)
// ═══════════════════════════════════════════════════════════════

export function calculateMaterialCompatibility(
    listedCategory: string,
    neededCategory: string,
    neededSubTypes?: string[],
    listedSubType?: string,
    excludedTypes?: string[]
): { score: number; formula: string } {
    // Exact category match
    if (listedCategory !== neededCategory) {
        return { score: 0, formula: `Material mismatch: ${listedCategory} ≠ ${neededCategory} → 0` };
    }

    let score = 80; // Base for category match

    // Excluded types
    if (excludedTypes && listedSubType && excludedTypes.includes(listedSubType)) {
        return { score: 0, formula: `Excluded subtype: ${listedSubType} → 0` };
    }

    // SubType bonus
    if (neededSubTypes && neededSubTypes.length > 0 && listedSubType) {
        if (neededSubTypes.includes(listedSubType)) {
            score = 100; // Perfect subtype match
        } else {
            score = 70; // Category match but not preferred subtype
        }
    } else if (!neededSubTypes || neededSubTypes.length === 0) {
        score = 90; // Category match, no subtype preference
    }

    return {
        score: clamp(round1(score), 0, 100),
        formula: `Material(${listedCategory}/${listedSubType || 'any'} vs ${neededCategory}/${neededSubTypes?.join(',') || 'any'}) = ${score}`,
    };
}
