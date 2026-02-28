import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { Company } from '../models/Company';
import { getEmissionForecast, getSuggestions, getBenchmark } from '../services/ml/mlService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Map internal industry enum to ML API industry strings
 */
function mapIndustry(industry: string): string {
    const map: Record<string, string> = {
        steel: 'Steel',
        textile: 'Textile',
        food_processing: 'Food_Processing',
        chemical: 'Chemical',
        pharma: 'Pharmaceutical',
        automotive: 'Automotive',
        construction: 'Construction',
        other: 'Manufacturing',
    };
    return map[industry] || 'Manufacturing';
}

/**
 * Build seasonal weather forecast (hardcoded averages)
 */
function buildWeatherForecast(): Array<{ month: string; avg_temp: number }> {
    const now = new Date();
    const result = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + i);
        const m = d.getMonth(); // 0-11
        const monthStr = d.toISOString().slice(0, 7); // e.g. "2024-07"
        let temp = 25;
        if (m >= 3 && m <= 5) temp = 38; // Apr-Jun
        else if (m >= 6 && m <= 8) temp = 30; // Jul-Sep
        else if (m >= 9 && m <= 11) temp = 20; // Oct-Dec
        else temp = 15; // Jan-Mar
        result.push({ month: monthStr, avg_temp: temp });
    }
    return result;
}

/**
 * POST /api/ml/forecast
 * Get emission forecast from ML API
 */
router.post('/forecast', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.body.companyId || req.user?.companyId;
        const company: any = await Company.findById(companyId);
        if (!company) {
            res.status(404).json({ success: false, error: 'Company not found' });
            return;
        }

        const baseMetrics = company.baselineMetrics || {};

        // Calculate scope values from company data
        const dieselL = baseMetrics.monthlyFuelLiters?.diesel || 0;
        const petrolL = baseMetrics.monthlyFuelLiters?.petrol || 0;
        const lpgL = baseMetrics.monthlyFuelLiters?.lpg || 0;
        const naturalGasKg = baseMetrics.monthlyFuelKg?.naturalGas || 0;
        const coalKg = (baseMetrics.monthlyFuelKg?.coal || 0);
        const electricityKwh = baseMetrics.monthlyElectricityKwh || 50000;
        const rawMaterialTons = 200; // default

        const scope1 = (dieselL * 2.68) + (petrolL * 2.31) + (naturalGasKg * 2.75) + (lpgL * 2.98) + (coalKg * 2.86);
        const scope2 = electricityKwh * 0.82;
        const scope3 = (rawMaterialTons * 150) + 1200;

        // Build production forecast (use volume * 1.02 increments)
        const volume = 1500;
        const now = new Date();
        const productionForecast = [];
        for (let i = 1; i <= 3; i++) {
            const d = new Date(now);
            d.setMonth(d.getMonth() + i);
            productionForecast.push({
                month: d.toISOString().slice(0, 7),
                volume: Math.round(volume * Math.pow(1.02, i)),
            });
        }

        const payload = {
            company_id: companyId,
            historical_emissions: [
                { month: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7), scope1: Math.round(scope1), scope2: Math.round(scope2), scope3: Math.round(scope3) },
            ],
            production_forecast: productionForecast,
            weather_forecast: buildWeatherForecast(),
            industry: mapIndustry(company.industry || 'other'),
            region: company.location?.state || 'punjab',
            confidence_threshold: 0.85,
        };

        const mlResult = await getEmissionForecast(payload);

        if (!mlResult) {
            res.status(503).json({ success: false, error: 'ML service temporarily unavailable. Please try again.' });
            return;
        }

        res.json({ success: true, data: mlResult });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ml/suggestions
 * Get AI suggestions from ML API
 */
router.post('/suggestions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.body.companyId || req.user?.companyId;
        const company: any = await Company.findById(companyId);
        if (!company) {
            res.status(404).json({ success: false, error: 'Company not found' });
            return;
        }

        const baseMetrics = company.baselineMetrics || {};
        const energyCtx = company.energyContext || {};

        const dieselL = baseMetrics.monthlyFuelLiters?.diesel || 2000;
        const electricityKwh = baseMetrics.monthlyElectricityKwh || 50000;
        const naturalGasKg = baseMetrics.monthlyFuelKg?.naturalGas || 5000;
        const coalTons = (baseMetrics.monthlyFuelKg?.coal || 10000) / 1000;

        const scope1 = (dieselL * 2.68) + (naturalGasKg * 2.75) + (coalTons * 1000 * 2.86);
        const scope2 = electricityKwh * 0.82;
        const scope3 = 12500;

        const totalEmissions = scope1 + scope2 + scope3;
        const dieselPct = Math.round((dieselL * 2.68 / totalEmissions) * 100);
        const electricityPct = Math.round((scope2 / totalEmissions) * 100);
        const coalPct = Math.round((coalTons * 1000 * 2.86 / totalEmissions) * 100);
        const wastePct = 100 - dieselPct - electricityPct - coalPct;

        const payload = {
            company_id: companyId,
            current_emissions: { scope1: Math.round(scope1), scope2: Math.round(scope2), scope3: Math.round(scope3) },
            emission_breakdown: {
                diesel: Math.max(dieselPct, 1),
                electricity: Math.max(electricityPct, 1),
                coal: Math.max(coalPct, 1),
                waste: Math.max(wastePct, 1),
            },
            industry: mapIndustry(company.industry || 'other'),
            company_size: (company.employeeCount || 500) > 200 ? 'Large' : 'Small',
            employee_total: company.employeeCount || 500,
            facility_area_sqm: company.facilitySize || 5000,
            monthly_electricity_kwh: electricityKwh,
            peak_demand_kw: 800,
            power_factor: 0.85,
            renewable_energy_percent: energyCtx.renewablePercentage || 10,
            operating_hours_per_day: 16,
            diesel_liters_monthly: dieselL,
            natural_gas_kg_monthly: naturalGasKg,
            coal_tons_monthly: coalTons,
            organic_waste_kg_monthly: 200,
            water_consumption_kl_monthly: (baseMetrics.monthlyWaterLiters || 100000) / 1000,
            water_recycling_percent: 20,
            raw_material_consumption_tons: 200,
            production_volume_monthly: 1500,
            current_initiatives: [],
            budget_flexibility: 'medium',
        };

        const mlResult = await getSuggestions(payload);

        if (!mlResult) {
            res.status(503).json({ success: false, error: 'ML service temporarily unavailable. Please try again.' });
            return;
        }

        res.json({ success: true, data: mlResult });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/ml/benchmark/:industry
 * Get industry benchmark from ML API
 */
router.get('/benchmark/:industry', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const industry = mapIndustry(req.params.industry as string);
        const mlResult = await getBenchmark(industry);

        if (!mlResult) {
            res.status(503).json({ success: false, error: 'ML service temporarily unavailable.' });
            return;
        }

        res.json({ success: true, data: mlResult });
    } catch (error) {
        next(error);
    }
});

export default router;
