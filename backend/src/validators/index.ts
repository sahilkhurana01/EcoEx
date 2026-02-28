import { z } from 'zod';

// ==================== AUTH ====================

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    industry: z.enum(['steel', 'textile', 'food_processing', 'chemical', 'construction', 'automotive', 'pharma', 'other']).optional(),
    location: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2).default([0, 0]),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
    }).optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
});

// ==================== COMPANY ====================

export const createCompanySchema = z.object({
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

// For updates, be fully permissive — Mongoose runValidators handles real schema enforcement
export const updateCompanySchema = z.record(z.any());

// ==================== WASTE LISTING ====================

export const createWasteListingSchema = z.object({
    material: z.object({
        category: z.enum(['metal_scrap', 'plastic', 'organic', 'fabric', 'wood', 'chemical', 'electronic', 'construction', 'mixed', 'energy_recovery']),
        subType: z.string().optional(),
        chemicalComposition: z.string().optional(),
        hazardous: z.boolean().default(false),
        msdsAvailable: z.boolean().optional(),
    }),
    quantity: z.object({
        value: z.number().positive('Quantity must be positive'),
        unit: z.enum(['kg', 'ton', 'liter', 'cubic_meter']),
        frequency: z.enum(['one_time', 'daily', 'weekly', 'monthly', 'quarterly']).default('monthly'),
        availableFrom: z.string().datetime().optional(),
        availableUntil: z.string().datetime().optional(),
    }),
    quality: z.object({
        grade: z.enum(['industrial', 'commercial', 'mixed', 'contaminated']).optional(),
        condition: z.enum(['clean', 'sorted', 'mixed', 'requires_processing']).optional(),
        description: z.string().max(1000).optional(),
        images: z.array(z.string().url()).optional(),
    }).optional(),
    pricing: z.object({
        type: z.enum(['fixed', 'negotiable', 'auction', 'free']).default('fixed'),
        amount: z.number().nonnegative().optional(),
        currency: z.string().default('INR'),
        minimumOrder: z.number().positive().optional(),
        bulkDiscount: z.object({
            threshold: z.number().positive(),
            percentage: z.number().min(0).max(100),
        }).optional(),
    }).optional(),
    logistics: z.object({
        pickupAvailable: z.boolean().default(false),
        deliveryAvailable: z.boolean().default(false),
        pickupRadiusKm: z.number().positive().optional(),
        packagingIncluded: z.boolean().optional(),
        loadingAssistance: z.boolean().optional(),
    }).optional(),
    location: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2),
        address: z.string().optional(),
    }).optional(),
    status: z.enum(['draft', 'active']).default('draft'),
    autoRelist: z.boolean().default(false),
});

export const updateWasteListingSchema = createWasteListingSchema.partial();

// ==================== NEED LISTING ====================

export const createNeedListingSchema = z.object({
    requirements: z.object({
        material: z.object({
            category: z.enum(['metal_scrap', 'plastic', 'organic', 'fabric', 'wood', 'chemical', 'electronic', 'construction', 'mixed']),
            subTypes: z.array(z.string()).optional(),
            excludedTypes: z.array(z.string()).optional(),
            quality: z.enum(['any', 'industrial', 'commercial']).optional(),
            hazardousAcceptable: z.boolean().default(false),
        }),
        quantity: z.object({
            min: z.number().positive(),
            max: z.number().positive(),
            unit: z.string(),
            frequency: z.string().optional(),
            flexibility: z.enum(['strict', 'flexible', 'spot_purchase']).default('flexible'),
        }),
        budget: z.object({
            maxPricePerUnit: z.number().positive(),
            currency: z.string().default('INR'),
            totalBudget: z.number().positive().optional(),
            negotiationRoom: z.number().min(0).max(100).optional(),
        }),
    }),
    logistics: z.object({
        maxDistanceKm: z.number().positive().default(100),
        pickupRequired: z.boolean().optional(),
        preferredRegions: z.array(z.string()).optional(),
        excludedRegions: z.array(z.string()).optional(),
    }).optional(),
    urgency: z.enum(['immediate', 'this_month', 'this_quarter', 'ongoing']).default('ongoing'),
    matchingPreferences: z.object({
        prioritizeDistance: z.number().min(0).max(1).default(0.3),
        prioritizePrice: z.number().min(0).max(1).default(0.3),
        prioritizeQuality: z.number().min(0).max(1).default(0.2),
        prioritizeReliability: z.number().min(0).max(1).default(0.2),
    }).optional(),
});

// ==================== IMPACT ====================

export const calculateImpactSchema = z.object({
    inputs: z.object({
        electricityKwh: z.number().nonnegative().optional(),
        fuelLiters: z.object({
            diesel: z.number().nonnegative().optional(),
            petrol: z.number().nonnegative().optional(),
            lpg: z.number().nonnegative().optional(),
        }).optional(),
        fuelKg: z.object({
            naturalGas: z.number().nonnegative().optional(),
            coal: z.number().nonnegative().optional(),
        }).optional(),
        waterLiters: z.number().nonnegative().optional(),
        rawMaterialsTons: z.number().nonnegative().optional(),
        wasteGenerated: z.number().nonnegative().optional(),
        wasteExchanged: z.number().nonnegative().optional(),
        wasteRecycled: z.number().nonnegative().optional(),
        wasteLandfilled: z.number().nonnegative().optional(),
        wasteExchangedValue: z.number().nonnegative().optional(),
        revenue: z.number().nonnegative().optional(),
        outputUnits: z.number().nonnegative().optional(),
    }),
    companyId: z.string().optional(),
    period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
    date: z.string().datetime().optional(),
});

// ==================== MATCHING ====================

export const findMatchesSchema = z.object({
    wasteListingId: z.string().min(1, 'wasteListingId is required'),
});

export const negotiateSchema = z.object({
    proposedPrice: z.number().positive().optional(),
    proposedQuantity: z.number().positive().optional(),
    proposedPickupDate: z.string().datetime().optional(),
    message: z.string().max(2000).optional(),
    attachments: z.array(z.string()).optional(),
});

export const completeMatchSchema = z.object({
    actualDistanceKm: z.number().positive().optional(),
    transportMode: z.enum(['truck', 'rail', 'ship', 'pipeline']).default('truck'),
    finalPrice: z.number().nonnegative().optional(),
});

// ==================== CHAT ====================

export const chatSchema = z.object({
    message: z.string().min(1, 'Message is required').max(2000),
});

// ==================== ESG ====================

export const esgReportSchema = z.object({
    period: z.string().default('Q4 2024'),
});
