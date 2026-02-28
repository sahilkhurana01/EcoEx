import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const ML_BASE_URL = env.ML_API_URL || 'https://ecoexchange-api.onrender.com';
const ML_TIMEOUT = 60000; // 60s because Render free tier cold start

const mlClient = axios.create({
    baseURL: ML_BASE_URL,
    timeout: ML_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Wake up the ML server (call on app start)
 */
export async function wakeUpML(): Promise<void> {
    try {
        const res = await mlClient.get('/health');
        logger.info('ML server is ready:', res.data?.status);
    } catch (error: any) {
        logger.warn('ML server wake up failed (will retry on first request):', error.message);
    }
}

/**
 * Get emission forecast from the ML API
 */
export async function getEmissionForecast(data: {
    company_id: string;
    historical_emissions: Array<{ month: string; scope1: number; scope2: number; scope3: number }>;
    production_forecast: Array<{ month: string; volume: number }>;
    weather_forecast: Array<{ month: string; avg_temp: number }>;
    industry: string;
    region?: string;
    confidence_threshold?: number;
}): Promise<any> {
    try {
        const response = await mlClient.post('/predict/emissions', data);
        return response.data;
    } catch (error: any) {
        logger.error('ML Forecast error:', error.message);
        return null;
    }
}

/**
 * Get AI suggestions from the ML API
 */
export async function getSuggestions(data: {
    company_id: string;
    current_emissions: { scope1: number; scope2: number; scope3: number };
    emission_breakdown: { diesel: number; electricity: number; coal: number; waste: number };
    industry: string;
    company_size: string;
    employee_total: number;
    facility_area_sqm: number;
    monthly_electricity_kwh: number;
    peak_demand_kw: number;
    power_factor: number;
    renewable_energy_percent: number;
    operating_hours_per_day: number;
    diesel_liters_monthly: number;
    natural_gas_kg_monthly: number;
    coal_tons_monthly: number;
    organic_waste_kg_monthly: number;
    water_consumption_kl_monthly: number;
    water_recycling_percent: number;
    raw_material_consumption_tons: number;
    production_volume_monthly: number;
    current_initiatives: string[];
    budget_flexibility: string;
}): Promise<any> {
    try {
        const response = await mlClient.post('/suggestions', data);
        return response.data;
    } catch (error: any) {
        logger.error('ML Suggestions error:', error.message);
        return null;
    }
}

/**
 * Get waste matches from the ML API
 */
export async function getWasteMatches(data: {
    listing: {
        material_type: string;
        quantity_kg: number;
        price_per_kg: number;
        latitude: number;
        longitude: number;
        quality_grade: string;
        industry: string;
    };
    max_distance_km: number;
    top_n: number;
}): Promise<any> {
    try {
        const response = await mlClient.post('/match', data);
        return response.data;
    } catch (error: any) {
        logger.error('ML Match error:', error.message);
        return null;
    }
}

/**
 * Get industry benchmark from the ML API
 */
export async function getBenchmark(industry: string): Promise<any> {
    try {
        const response = await mlClient.get(`/benchmark/${industry}`);
        return response.data;
    } catch (error: any) {
        logger.error('ML Benchmark error:', error.message);
        return null;
    }
}
