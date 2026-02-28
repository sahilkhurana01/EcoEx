/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 23-25
 * ECONOMIC MODULE
 */

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// FORMULA 23: Carbon Abatement Cost
// CAC = (Cost_intervention - Cost_baseline) / (Emissions_baseline - Emissions_intervention)
export function calculateAbatementCost(
    costBaseline: number, costIntervention: number,
    emissionsBaseline: number, emissionsIntervention: number
): { cacInrPerKg: number; emissionsReduced: number; formula: string } {
    const reduced = emissionsBaseline - emissionsIntervention;
    if (reduced <= 0) throw new Error('Intervention must reduce emissions');
    const cac = (costIntervention - costBaseline) / reduced;
    return {
        cacInrPerKg: round2(cac),
        emissionsReduced: round2(reduced),
        formula: `CAC = (${costIntervention} - ${costBaseline}) / (${emissionsBaseline} - ${emissionsIntervention}) = ₹${round2(cac)}/kg CO2`,
    };
}

// FORMULA 24: Internal Rate of Return (Newton-Raphson)
// 0 = Σ (CF_t / (1+IRR)^t)
export function calculateIRR(cashFlows: number[], maxIterations: number = 100, tolerance: number = 0.0001): {
    irr: number; irrPercent: number; converged: boolean; formula: string;
} {
    if (cashFlows.length < 2) throw new Error('Need at least 2 cash flows');
    const hasSignChange = cashFlows.some((cf, i) => i > 0 && (cf > 0) !== (cashFlows[0] > 0));
    if (!hasSignChange) throw new Error('Cash flows must have at least one sign change');

    let irr = 0.1; // Initial guess
    let converged = false;

    for (let iter = 0; iter < maxIterations; iter++) {
        let npv = 0, dNpv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            const denom = Math.pow(1 + irr, t);
            npv += cashFlows[t] / denom;
            dNpv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
        }
        if (Math.abs(dNpv) < 1e-12) break;
        const newIrr = irr - npv / dNpv;
        if (Math.abs(newIrr - irr) < tolerance) { irr = newIrr; converged = true; break; }
        irr = newIrr;
    }

    return {
        irr: round2(irr),
        irrPercent: round2(irr * 100),
        converged,
        formula: `IRR = ${round2(irr * 100)}% (${converged ? 'converged' : 'max iterations'})`,
    };
}

// FORMULA 25: Eco-efficiency
// Eco_eff = Product_Value / Environmental_Impact
export function calculateEcoEfficiency(
    productValueINR: number, environmentalImpactKgCo2: number
): { ecoEfficiency: number; formula: string; interpretation: string } {
    if (productValueINR <= 0) throw new Error('productValue must be > 0');
    if (environmentalImpactKgCo2 <= 0) throw new Error('environmentalImpact must be > 0');
    const eff = productValueINR / environmentalImpactKgCo2;
    const interpretation = eff > 1000 ? 'Excellent eco-efficiency' : eff > 500 ? 'Good eco-efficiency' : eff > 100 ? 'Moderate — room for improvement' : 'Poor eco-efficiency';
    return {
        ecoEfficiency: round2(eff),
        formula: `EcoEff = ₹${productValueINR} / ${environmentalImpactKgCo2} kg CO2 = ${round2(eff)} INR/kg CO2`,
        interpretation,
    };
}
