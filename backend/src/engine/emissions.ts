/**
 * ECOEXCHANGE MATHEMATICAL ENGINE — FORMULAS 1-9
 * CARBON EMISSIONS & WASTE MODULE
 *
 * ZERO AI. All math is deterministic and hardcoded.
 * AI is only used AFTER calculation for verification/explanation.
 */

import {
    GRID_EMISSION_FACTORS,
    LIQUID_FUEL_FACTORS,
    MASS_FUEL_FACTORS,
    LANDFILL_CONSTANTS,
    CH4_PER_KG_ORGANIC_WASTE,
    CO2E_PER_KG_ORGANIC_LANDFILL,
    INCINERATION_FACTORS,
} from './constants';

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

function assertPositive(value: number, name: string): void {
    if (value <= 0) throw new Error(`${name} must be > 0, got ${value}`);
}

function assertNonNegative(value: number, name: string): void {
    if (value < 0) throw new Error(`${name} must be >= 0, got ${value}`);
}

function assertInEnum<T>(value: T, valid: T[], name: string): void {
    if (!valid.includes(value)) throw new Error(`${name} must be one of [${valid.join(', ')}], got ${value}`);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 1: Scope 2 Electricity Emissions
// CO2_kg = kWh × Grid_Emission_Factor
// ═══════════════════════════════════════════════════════════════

export interface ElectricityEmissionsInput {
    kWh: number;
    gridType: string;  // coal_heavy | mixed | renewable_heavy | global_average | unknown
}

export interface ElectricityEmissionsResult {
    formula: string;
    co2Kg: number;
    kWh: number;
    gridFactor: number;
    gridType: string;
}

export function calculateElectricityEmissions(input: ElectricityEmissionsInput): ElectricityEmissionsResult {
    assertPositive(input.kWh, 'kWh');
    const gridType = input.gridType || 'unknown';
    const gridFactor = GRID_EMISSION_FACTORS[gridType];
    if (gridFactor === undefined) {
        throw new Error(`Unknown grid type: ${gridType}. Valid: ${Object.keys(GRID_EMISSION_FACTORS).join(', ')}`);
    }

    const co2Kg = input.kWh * gridFactor;

    return {
        formula: `CO2_kg = ${input.kWh} kWh × ${gridFactor} kg_CO2/kWh`,
        co2Kg: round2(co2Kg),
        kWh: input.kWh,
        gridFactor,
        gridType,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 2: Liquid Fuel Combustion
// CO2_kg = Liters × EF_per_liter
// ═══════════════════════════════════════════════════════════════

export interface LiquidFuelInput {
    fuelType: string;  // diesel | petrol | lpg
    liters: number;
}

export interface FuelEmissionsResult {
    formula: string;
    co2Kg: number;
    fuelType: string;
    quantity: number;
    unit: string;
    factor: number;
}

export function calculateLiquidFuelEmissions(input: LiquidFuelInput): FuelEmissionsResult {
    assertPositive(input.liters, 'liters');
    const factor = LIQUID_FUEL_FACTORS[input.fuelType];
    if (factor === undefined) {
        throw new Error(`Unknown fuel type: ${input.fuelType}. Valid: ${Object.keys(LIQUID_FUEL_FACTORS).join(', ')}`);
    }

    const co2Kg = input.liters * factor;

    return {
        formula: `CO2_kg = ${input.liters} L × ${factor} kg_CO2/L`,
        co2Kg: round2(co2Kg),
        fuelType: input.fuelType,
        quantity: input.liters,
        unit: 'liters',
        factor,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 3: Gaseous Fuel Combustion
// CO2_kg = Mass_kg × Factor
// ═══════════════════════════════════════════════════════════════

export function calculateGaseousFuelEmissions(input: { fuelType: string; massKg: number }): FuelEmissionsResult {
    assertPositive(input.massKg, 'massKg');
    const key = input.fuelType === 'naturalGas' ? 'natural_gas' : input.fuelType;
    const factor = MASS_FUEL_FACTORS[key] || MASS_FUEL_FACTORS[input.fuelType];
    if (factor === undefined) {
        throw new Error(`Unknown gas fuel: ${input.fuelType}. Valid: ${Object.keys(MASS_FUEL_FACTORS).join(', ')}`);
    }

    const co2Kg = input.massKg * factor;

    return {
        formula: `CO2_kg = ${input.massKg} kg × ${factor} kg_CO2/kg`,
        co2Kg: round2(co2Kg),
        fuelType: input.fuelType,
        quantity: input.massKg,
        unit: 'kg',
        factor,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 4: Solid Fuel (Coal)
// CO2_kg = Tons × 1000 × 2.86 kg/kg = Tons × 2860
// ═══════════════════════════════════════════════════════════════

export function calculateCoalEmissions(tons: number): FuelEmissionsResult {
    assertPositive(tons, 'tons');
    const FACTOR_PER_TON = 2860; // 2.86 kg CO2/kg × 1000 kg/ton
    const co2Kg = tons * FACTOR_PER_TON;

    return {
        formula: `CO2_kg = ${tons} tons × 2860 kg_CO2/ton`,
        co2Kg: round2(co2Kg),
        fuelType: 'coal',
        quantity: tons,
        unit: 'tons',
        factor: FACTOR_PER_TON,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 5: Total Carbon Footprint
// E_total = E_direct (fuels) + E_electric + E_supply_chain
// ═══════════════════════════════════════════════════════════════

export interface TotalCarbonInput {
    electricityKwh?: number;
    gridType?: string;
    dieselLiters?: number;
    petrolLiters?: number;
    lpgLiters?: number;
    naturalGasKg?: number;
    coalTons?: number;
    supplyChainKg?: number; // Scope 3 estimate
}

export interface TotalCarbonResult {
    scope1: number;  // Direct fuel combustion
    scope2: number;  // Electricity
    scope3: number;  // Supply chain
    totalCo2e: number;
    breakdown: {
        electricity: number;
        diesel: number;
        petrol: number;
        lpg: number;
        naturalGas: number;
        coal: number;
        supplyChain: number;
    };
    formulas: string[];
}

export function calculateTotalCarbon(input: TotalCarbonInput): TotalCarbonResult {
    const formulas: string[] = [];
    const breakdown = {
        electricity: 0, diesel: 0, petrol: 0,
        lpg: 0, naturalGas: 0, coal: 0, supplyChain: 0,
    };

    // Scope 2: Electricity
    if (input.electricityKwh && input.electricityKwh > 0) {
        const r = calculateElectricityEmissions({ kWh: input.electricityKwh, gridType: input.gridType || 'mixed' });
        breakdown.electricity = r.co2Kg;
        formulas.push(r.formula);
    }

    // Scope 1: Direct fuels
    if (input.dieselLiters && input.dieselLiters > 0) {
        const r = calculateLiquidFuelEmissions({ fuelType: 'diesel', liters: input.dieselLiters });
        breakdown.diesel = r.co2Kg;
        formulas.push(r.formula);
    }
    if (input.petrolLiters && input.petrolLiters > 0) {
        const r = calculateLiquidFuelEmissions({ fuelType: 'petrol', liters: input.petrolLiters });
        breakdown.petrol = r.co2Kg;
        formulas.push(r.formula);
    }
    if (input.lpgLiters && input.lpgLiters > 0) {
        const r = calculateLiquidFuelEmissions({ fuelType: 'lpg', liters: input.lpgLiters });
        breakdown.lpg = r.co2Kg;
        formulas.push(r.formula);
    }
    if (input.naturalGasKg && input.naturalGasKg > 0) {
        const r = calculateGaseousFuelEmissions({ fuelType: 'natural_gas', massKg: input.naturalGasKg });
        breakdown.naturalGas = r.co2Kg;
        formulas.push(r.formula);
    }
    if (input.coalTons && input.coalTons > 0) {
        const r = calculateCoalEmissions(input.coalTons);
        breakdown.coal = r.co2Kg;
        formulas.push(r.formula);
    }

    // Scope 3
    breakdown.supplyChain = round2(Math.max(0, input.supplyChainKg || 0));

    const scope1 = round2(breakdown.diesel + breakdown.petrol + breakdown.lpg + breakdown.naturalGas + breakdown.coal);
    const scope2 = breakdown.electricity;
    const scope3 = breakdown.supplyChain;
    const totalCo2e = round2(scope1 + scope2 + scope3);

    formulas.push(`E_total = ${scope1} (Scope1) + ${scope2} (Scope2) + ${scope3} (Scope3) = ${totalCo2e} kg CO2e`);

    return { scope1, scope2, scope3, totalCo2e, breakdown, formulas };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 6: Carbon Intensity
// CI = Total_Emissions_kg / Denominator
// ═══════════════════════════════════════════════════════════════

export function calculateCarbonIntensity(
    totalEmissionsKg: number,
    denominator: number,
    denominatorUnit: 'revenue_lakhs' | 'production_tons' | 'sqft' | 'employees'
): { carbonIntensity: number; formula: string; unit: string } {
    assertNonNegative(totalEmissionsKg, 'totalEmissionsKg');
    assertPositive(denominator, 'denominator');

    const ci = totalEmissionsKg / denominator;
    const unitLabel = `kg_CO2/${denominatorUnit}`;

    return {
        carbonIntensity: round2(ci),
        formula: `CI = ${totalEmissionsKg} kg / ${denominator} ${denominatorUnit} = ${round2(ci)} ${unitLabel}`,
        unit: unitLabel,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 7: Landfill Methane Generation (IPCC First Order Decay)
// CH4_kg = Waste_kg × DOC × DOCf × F × (16/12) × MCF × (1-R)
// ═══════════════════════════════════════════════════════════════

export function calculateLandfillMethane(wasteKg: number, organicFraction: number = 1.0): {
    ch4Kg: number;
    co2eKg: number;
    formula: string;
    constants: typeof LANDFILL_CONSTANTS;
} {
    assertPositive(wasteKg, 'wasteKg');
    assertPositive(organicFraction, 'organicFraction');

    const organicWasteKg = wasteKg * organicFraction;
    const ch4Kg = round2(organicWasteKg * CH4_PER_KG_ORGANIC_WASTE);
    const co2eKg = round2(organicWasteKg * CO2E_PER_KG_ORGANIC_LANDFILL);

    return {
        ch4Kg,
        co2eKg,
        formula: `CH4 = ${organicWasteKg} kg × ${round2(CH4_PER_KG_ORGANIC_WASTE)} = ${ch4Kg} kg CH4 → ${co2eKg} kg CO2e`,
        constants: LANDFILL_CONSTANTS,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 8: Methane CO2 Equivalent
// CO2e_kg = CH4_kg × GWP × (1 - OxF)
// ═══════════════════════════════════════════════════════════════

export function methaneToCo2e(ch4Kg: number): { co2eKg: number; formula: string } {
    assertNonNegative(ch4Kg, 'ch4Kg');
    const co2eKg = ch4Kg * LANDFILL_CONSTANTS.GWP_CH4 * (1 - LANDFILL_CONSTANTS.OXIDATION_FACTOR);

    return {
        co2eKg: round2(co2eKg),
        formula: `CO2e = ${ch4Kg} × ${LANDFILL_CONSTANTS.GWP_CH4} × ${1 - LANDFILL_CONSTANTS.OXIDATION_FACTOR} = ${round2(co2eKg)} kg`,
    };
}

// ═══════════════════════════════════════════════════════════════
// FORMULA 9: Waste Incineration Emissions
// CO2_kg = Waste_kg × EF_waste × (1 - R_energy_recovery)
// ═══════════════════════════════════════════════════════════════

export function calculateIncinerationEmissions(
    wasteKg: number,
    wasteType: string,
    energyRecovery: number = 0
): { co2Kg: number; formula: string } {
    assertPositive(wasteKg, 'wasteKg');
    if (energyRecovery < 0 || energyRecovery > 1) throw new Error('energyRecovery must be 0-1');

    const factor = INCINERATION_FACTORS[wasteType] || INCINERATION_FACTORS['mixed'];
    const co2Kg = wasteKg * factor * (1 - energyRecovery);

    return {
        co2Kg: round2(co2Kg),
        formula: `CO2 = ${wasteKg} kg × ${factor} × (1 - ${energyRecovery}) = ${round2(co2Kg)} kg`,
    };
}
