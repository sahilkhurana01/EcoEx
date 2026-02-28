import {
    RECYCLING_SAVINGS,
    WATER_SAVINGS_PER_KG,
    ENERGY_SAVINGS_PER_KG,
    LANDFILL_VOLUME_PER_KG,
    GRID_EMISSION_FACTOR_INDIA,
    FUEL_EMISSION_FACTORS,
    WATER_EMISSION_FACTOR,
    TRANSPORT_EMISSION_FACTORS,
} from '../../utils/constants';
import { logger } from '../../utils/logger';

type MaterialType = keyof typeof RECYCLING_SAVINGS;

export class ImpactCalculator {
    /**
     * Calculate CO2 emissions from energy inputs
     */
    calculateEmissions(inputs: {
        electricityKwh?: number;
        fuelLiters?: { diesel?: number; petrol?: number; lpg?: number };
        fuelKg?: { naturalGas?: number; coal?: number };
        waterLiters?: number;
    }): {
        scope1: number;
        scope2: number;
        scope3: number;
        totalCo2e: number;
        breakdown: Record<string, number>;
    } {
        // Scope 2: Electricity (indirect)
        const electricityCo2 = (inputs.electricityKwh || 0) * GRID_EMISSION_FACTOR_INDIA;

        // Scope 1: Direct fuel combustion
        const dieselCo2 = (inputs.fuelLiters?.diesel || 0) * FUEL_EMISSION_FACTORS.diesel;
        const petrolCo2 = (inputs.fuelLiters?.petrol || 0) * FUEL_EMISSION_FACTORS.petrol;
        const lpgCo2 = (inputs.fuelLiters?.lpg || 0) * FUEL_EMISSION_FACTORS.lpg;
        const naturalGasCo2 = (inputs.fuelKg?.naturalGas || 0) * FUEL_EMISSION_FACTORS.naturalGas;
        const coalCo2 = (inputs.fuelKg?.coal || 0) * FUEL_EMISSION_FACTORS.coal;

        // Scope 3: Water treatment
        const waterCo2 = ((inputs.waterLiters || 0) / 1000) * WATER_EMISSION_FACTOR;

        const scope1 = this.round(dieselCo2 + petrolCo2 + lpgCo2 + naturalGasCo2 + coalCo2);
        const scope2 = this.round(electricityCo2);
        const scope3 = this.round(waterCo2);
        const totalCo2e = this.round(scope1 + scope2 + scope3);

        return {
            scope1,
            scope2,
            scope3,
            totalCo2e,
            breakdown: {
                electricity: this.round(electricityCo2),
                diesel: this.round(dieselCo2),
                coal: this.round(coalCo2),
                naturalGas: this.round(naturalGasCo2),
                waste: 0,
                transport: 0,
            },
        };
    }

    /**
     * Calculate environmental savings from waste exchange
     */
    calculateExchangeImpact(
        materialType: string,
        quantityKg: number,
        transportDistanceKm: number,
        transportMode: 'truck' | 'rail' | 'ship' | 'pipeline' = 'truck'
    ): {
        co2SavedKg: number;
        waterSavedLiters: number;
        energySavedKwh: number;
        landfillAvoidedM3: number;
        transportEmissionsKg: number;
        netCo2Saved: number;
    } {
        const type = materialType as MaterialType;

        const co2Saved = this.round((RECYCLING_SAVINGS[type] || 1.0) * quantityKg);
        const waterSaved = Math.round((WATER_SAVINGS_PER_KG[type] || 10) * quantityKg);
        const energySaved = this.round((ENERGY_SAVINGS_PER_KG[type] || 1.5) * quantityKg);
        const landfillAvoided = this.round((LANDFILL_VOLUME_PER_KG[type] || 0.001) * quantityKg, 4);

        const weightTons = quantityKg / 1000;
        const transportEmissions = this.round(
            transportDistanceKm * weightTons * TRANSPORT_EMISSION_FACTORS[transportMode]
        );

        return {
            co2SavedKg: co2Saved,
            waterSavedLiters: waterSaved,
            energySavedKwh: energySaved,
            landfillAvoidedM3: landfillAvoided,
            transportEmissionsKg: transportEmissions,
            netCo2Saved: this.round(co2Saved - transportEmissions),
        };
    }

    /**
     * Normalize quantity to kg
     */
    normalizeToKg(value: number, unit: string): number {
        const conversions: Record<string, number> = {
            kg: 1,
            ton: 1000,
            liter: 1,
            cubic_meter: 1000,
        };
        return value * (conversions[unit] || 1);
    }

    /**
     * Calculate circularity rate
     */
    calculateCircularityRate(wasteGenerated: number, wasteExchanged: number, wasteRecycled: number): number {
        if (wasteGenerated === 0) return 0;
        return this.round(((wasteExchanged + wasteRecycled) / wasteGenerated) * 100);
    }

    private round(value: number, decimals: number = 2): number {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}

export const impactCalculator = new ImpactCalculator();
