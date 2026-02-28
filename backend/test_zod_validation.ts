// Quick test: what does the updateCompanySchema reject?
import { z } from 'zod';

const createCompanySchema = z.object({
    name: z.string().min(2).max(200),
    tradingName: z.string().max(200).optional(),
    industry: z.enum([
        'manufacturing', 'healthcare', 'steel', 'textile',
        'food_processing', 'chemical', 'pharmaceutical',
        'construction', 'automotive', 'electronics',
        'energy', 'pharma', 'other',
    ]),
    email: z.string().email().optional(),
    registrationNumber: z.string().optional(),
    yearEstablished: z.number().int().optional(),
    website: z.string().url().or(z.string().length(0)).optional(),
    subIndustry: z.string().optional(),
    location: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().default('India'),
        timezone: z.string().optional(),
    }).optional(),
    facilityArea: z.number().positive().optional(),
    numberOfBuildings: z.number().int().positive().optional(),
    operatingHoursPerDay: z.number().min(0).max(24).optional(),
    operatingDaysPerWeek: z.number().min(0).max(7).optional(),
    numberOfShifts: z.number().int().min(0).optional(),
    productionCapacity: z.string().optional(),
    totalEmployees: z.number().int().nonnegative().optional(),
    annualTurnover: z.enum(['<1cr', '1-10cr', '10-50cr', '50-100cr', '100-500cr', '>500cr']).optional(),

    electricityProvider: z.enum(['PSPCL', 'MSEDCL', 'Tata Power', 'Adani', 'BSES', 'CESC', 'Other']).optional(),
    consumerNumber: z.string().optional(),
    renewablePercentage: z.number().min(0).max(100).optional(),

    fuelConsumption: z.object({
        diesel: z.object({
            generators: z.number().nonnegative().optional(),
            vehicles: z.number().nonnegative().optional(),
            machinery: z.number().nonnegative().optional(),
        }).optional(),
        petrol: z.object({
            transport: z.number().nonnegative().optional(),
        }).optional(),
        naturalGasKg: z.number().nonnegative().optional(),
        lpgKg: z.number().nonnegative().optional(),
        coalTons: z.number().nonnegative().optional(),
        biomassTons: z.number().nonnegative().optional(),
        furnaceOilLiters: z.number().nonnegative().optional(),
    }).optional(),

    waterUsage: z.object({
        source: z.enum(['municipal', 'groundwater', 'surface_water', 'recycled', 'mixed']).optional(),
        monthlyConsumptionKl: z.number().nonnegative().optional(),
        recyclingPercentage: z.number().min(0).max(100).optional(),
    }).optional(),

    productionData: z.object({
        primaryProducts: z.array(z.string()).optional(),
        monthlyProductionVolume: z.number().nonnegative().optional(),
        productionUnit: z.string().optional(),
    }).optional(),

    wasteStreams: z.array(z.object({
        type: z.string(),
        quantityPerMonth: z.number().nonnegative(),
        unit: z.enum(['kg', 'ton']),
        disposalMethod: z.string().optional(),
    })).optional(),

    compliance: z.object({
        iso14001: z.enum(['certified', 'in_progress', 'planned', 'none']).optional(),
        esgReporting: z.boolean().optional(),
        sustainabilityTargets: z.string().optional(),
    }).optional(),

    onboardingComplete: z.boolean().optional(),
    onboardingStep: z.number().optional(),
    verificationStatus: z.string().optional(),

    // Legacy support
    facilitySize: z.number().positive().optional(),
    employeeCount: z.number().int().positive().optional(),
    annualRevenue: z.enum(['<1cr', '1-10cr', '10-50cr', '50-100cr', '>100cr']).optional(),
    baselineMetrics: z.any().optional(),
    energyContext: z.any().optional(),
}).passthrough();

const updateCompanySchema = createCompanySchema.partial();

// Simulate the EXACT payload from the frontend (with empty form)
const payload = {
    tradingName: undefined,
    registrationNumber: undefined,
    yearEstablished: undefined,
    website: undefined,

    location: {
        type: "Point",
        coordinates: [0, 0],
        address: undefined,
        state: undefined,
    },
    facilityArea: undefined,
    operatingDaysPerWeek: 6,
    numberOfShifts: 2,

    industry: 'other',
    subIndustry: undefined,
    productionCapacity: undefined,
    totalEmployees: undefined,

    electricityProvider: undefined,
    consumerNumber: undefined,
    baselineMetrics: {
        monthlyElectricityKwh: 0,
    },
    renewablePercentage: 0,

    fuelConsumption: {
        diesel: {
            generators: 0,
            vehicles: 0,
        },
        naturalGasKg: 0,
        coalTons: 0,
    },

    waterUsage: {
        source: 'municipal',
        monthlyConsumptionKl: 0,
        recyclingPercentage: 0,
    },

    productionData: {
        primaryProducts: [],
        monthlyProductionVolume: undefined,
        productionUnit: undefined,
    },

    wasteStreams: [],

    compliance: {
        iso14001: 'none',
        esgReporting: false,
        sustainabilityTargets: undefined
    },

    onboardingComplete: true,
    onboardingStep: 10,
    verificationStatus: 'in_progress'
};

const result = updateCompanySchema.safeParse(payload);
if (result.success) {
    console.log('✅ VALIDATION PASSED');
    console.log('Parsed data:', JSON.stringify(result.data, null, 2));
} else {
    console.log('❌ VALIDATION FAILED');
    console.log('Errors:', JSON.stringify(result.error.errors, null, 2));
}
