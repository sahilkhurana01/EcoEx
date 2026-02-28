import mongoose, { Schema, Document } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE COMPANY DOCUMENT — ALL 10 ONBOARDING STEPS
// ═══════════════════════════════════════════════════════════════

export interface EmployeeBreakdown {
    management: number;
    technical: number;
    skilled: number;
    unskilled: number;
    contract: number;
}

export interface MonthlyConsumption {
    month: string; // YYYY-MM
    value: number;
}

export interface WasteStream {
    category: string;
    type: string;
    quantityPerMonth: number;
    unit: 'kg' | 'ton';
    disposalMethod: string;
    condition?: string;
    currentlySold?: boolean;
    storageCapacity?: number;
}

export interface CompanyDocument extends Document {
    // Step 1: Basic Identity
    clerkUserId?: string;
    name: string;
    tradingName?: string;
    slug: string;
    email?: string;
    password?: string;
    registrationNumber?: string;
    yearEstablished?: number;
    website?: string;

    // Step 2: Location & Facilities
    location: {
        type: string;
        coordinates: number[];
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        timezone?: string;
    };
    additionalFacilities?: Array<{
        address: string;
        city: string;
        state: string;
        coordinates?: number[];
    }>;
    facilityArea?: number; // sq meters
    numberOfBuildings?: number;
    operatingHoursPerDay?: number;
    operatingDaysPerWeek?: number;
    numberOfShifts?: number;

    // Step 3: Industry Classification
    industry: string;
    subIndustry?: string;
    productionCapacity?: string;
    annualTurnover?: string;
    employeeBreakdown?: EmployeeBreakdown;
    totalEmployees?: number;

    // Step 4: Energy Profile
    electricityConnectionType?: string;
    electricityProvider?: string;
    consumerNumber?: string;
    monthlyElectricity?: MonthlyConsumption[];
    peakDemandKw?: number;
    powerFactor?: number;
    renewablePercentage?: number;
    captivePowerMw?: number;
    backupGeneratorCapacityKva?: number;
    backupGeneratorFuelType?: string;

    // Step 5: Fuel Consumption
    fuelConsumption?: {
        diesel?: { generators?: number; vehicles?: number; machinery?: number };
        petrol?: { transport?: number };
        naturalGasKg?: number;
        lpgKg?: number;
        coalTons?: number;
        biomassTons?: number;
        furnaceOilLiters?: number;
        otherFuel?: { name?: string; quantity?: number; unit?: string };
    };

    // Step 6: Water Usage
    waterUsage?: {
        source?: string;
        monthlyConsumptionKl?: number;
        wastewaterGenerationKl?: number;
        treatmentCapacityKl?: number;
        recyclingPercentage?: number;
    };

    // Step 7: Production Data
    productionData?: {
        primaryProducts?: string[];
        monthlyProductionVolume?: number;
        productionUnit?: string;
        rawMaterials?: Array<{ name: string; quantityPerMonth: number; unit: string }>;
        materialIntensityPerUnit?: number;
    };

    // Step 8: Waste Profile
    wasteStreams?: WasteStream[];
    hazardousWaste?: Array<{
        category: string;
        quantityPerMonth: number;
        unit: string;
        disposalMethod: string;
    }>;
    wasteStorageCapacity?: number;

    // Step 9: Compliance & Certifications
    compliance?: {
        iso14001?: string; // 'certified' | 'in_progress' | 'planned' | 'none'
        esgReporting?: boolean;
        environmentalClearances?: string[];
        sustainabilityTargets?: string;
    };

    // Legacy compatibility
    facilitySize?: number;
    employeeCount?: number;
    annualRevenue?: string;
    operatingHours?: any;
    baselineMetrics?: any;
    energyContext?: {
        gridSource?: string;
        renewablePercentage?: number;
        peakHours?: { start: number; end: number };
    };

    // Status
    onboardingStep?: number;
    onboardingComplete: boolean;
    verificationStatus: string;
    lastLoginAt?: Date;
    role?: string;
    createdAt: Date;
    updatedAt: Date;
}

const monthlyConsumptionSchema = new Schema({
    month: String,
    value: Number,
}, { _id: false });

const wasteStreamSchema = new Schema({
    category: { type: String, enum: ['hazardous', 'non_hazardous'] },
    type: {
        type: String,
        enum: [
            'metal_scrap', 'plastic', 'paper', 'wood', 'glass', 'textile',
            'organic', 'e_waste', 'construction', 'chemical', 'fabric',
            'slag', 'fly_ash', 'mixed', 'electronic', 'other',
        ],
    },
    quantityPerMonth: Number,
    unit: { type: String, enum: ['kg', 'ton'], default: 'kg' },
    disposalMethod: { type: String, enum: ['landfill', 'recycling', 'sold', 'incineration', 'stored', 'composting', 'other'] },
    condition: { type: String, enum: ['clean', 'mixed', 'contaminated'] },
    currentlySold: Boolean,
    storageCapacity: Number,
}, { _id: false });

const companySchema = new Schema(
    {
        // Step 1: Basic Identity
        clerkUserId: { type: String, index: true, sparse: true },
        name: { type: String, required: true, index: true, trim: true },
        tradingName: { type: String, trim: true },
        slug: { type: String, unique: true, lowercase: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
        password: { type: String, select: false },
        registrationNumber: { type: String, trim: true },
        yearEstablished: Number,
        website: { type: String, trim: true },

        // Step 2: Location & Facilities
        location: {
            type: { type: String, default: 'Point', enum: ['Point'] },
            coordinates: { type: [Number], default: [0, 0] },
            address: String,
            city: String,
            state: String,
            country: { type: String, default: 'India' },
            timezone: String,
        },
        additionalFacilities: [{
            address: String,
            city: String,
            state: String,
            coordinates: [Number],
        }],
        facilityArea: Number,
        numberOfBuildings: Number,
        operatingHoursPerDay: Number,
        operatingDaysPerWeek: Number,
        numberOfShifts: Number,

        // Step 3: Industry Classification
        industry: {
            type: String,
            enum: [
                'manufacturing', 'healthcare', 'steel', 'textile',
                'food_processing', 'chemical', 'pharmaceutical',
                'construction', 'automotive', 'electronics',
                'energy', 'pharma', 'other',
            ],
            required: true,
            index: true,
        },
        subIndustry: { type: String, trim: true },
        productionCapacity: String,
        annualTurnover: {
            type: String,
            enum: ['<1cr', '1-10cr', '10-50cr', '50-100cr', '100-500cr', '>500cr'],
        },
        employeeBreakdown: {
            management: { type: Number, default: 0 },
            technical: { type: Number, default: 0 },
            skilled: { type: Number, default: 0 },
            unskilled: { type: Number, default: 0 },
            contract: { type: Number, default: 0 },
        },
        totalEmployees: Number,

        // Step 4: Energy Profile
        electricityConnectionType: { type: String, enum: ['HT', 'LT', 'Industrial', 'Commercial'] },
        electricityProvider: { type: String, enum: ['PSPCL', 'MSEDCL', 'Tata Power', 'Adani', 'BSES', 'CESC', 'Other'] },
        consumerNumber: String,
        monthlyElectricity: [monthlyConsumptionSchema],
        peakDemandKw: Number,
        powerFactor: Number,
        renewablePercentage: { type: Number, default: 0 },
        captivePowerMw: Number,
        backupGeneratorCapacityKva: Number,
        backupGeneratorFuelType: { type: String, enum: ['diesel', 'natural_gas', 'dual_fuel'] },

        // Step 5: Fuel Consumption
        fuelConsumption: {
            diesel: {
                generators: { type: Number, default: 0 },
                vehicles: { type: Number, default: 0 },
                machinery: { type: Number, default: 0 },
            },
            petrol: {
                transport: { type: Number, default: 0 },
            },
            naturalGasKg: { type: Number, default: 0 },
            lpgKg: { type: Number, default: 0 },
            coalTons: { type: Number, default: 0 },
            biomassTons: { type: Number, default: 0 },
            furnaceOilLiters: { type: Number, default: 0 },
            otherFuel: {
                name: String,
                quantity: Number,
                unit: String,
            },
        },

        // Step 6: Water Usage
        waterUsage: {
            source: { type: String, enum: ['municipal', 'groundwater', 'surface_water', 'recycled', 'mixed'] },
            monthlyConsumptionKl: Number,
            wastewaterGenerationKl: Number,
            treatmentCapacityKl: Number,
            recyclingPercentage: { type: Number, default: 0 },
        },

        // Step 7: Production Data
        productionData: {
            primaryProducts: [String],
            monthlyProductionVolume: Number,
            productionUnit: String,
            rawMaterials: [{
                name: String,
                quantityPerMonth: Number,
                unit: String,
            }],
            materialIntensityPerUnit: Number,
        },

        // Step 8: Waste Profile
        wasteStreams: [wasteStreamSchema],
        hazardousWaste: [{
            category: String,
            quantityPerMonth: Number,
            unit: String,
            disposalMethod: String,
        }],
        wasteStorageCapacity: Number,

        // Step 9: Compliance & Certifications
        compliance: {
            iso14001: { type: String, enum: ['certified', 'in_progress', 'planned', 'none'], default: 'none' },
            esgReporting: { type: Boolean, default: false },
            environmentalClearances: [String],
            sustainabilityTargets: String,
        },

        // Legacy compat
        facilitySize: Number,
        employeeCount: Number,
        annualRevenue: {
            type: String,
            enum: ['<1cr', '1-10cr', '10-50cr', '50-100cr', '>100cr'],
        },
        operatingHours: {
            start: Number,
            end: Number,
            shifts: [{ name: String, start: Number, end: Number }],
        },
        baselineMetrics: {
            monthlyElectricityKwh: Number,
            monthlyFuelLiters: { diesel: Number, petrol: Number, lpg: Number },
            monthlyFuelKg: { naturalGas: Number, coal: Number },
            monthlyWaterLiters: Number,
            wasteStreams: [{
                type: { type: String, enum: ['metal_scrap', 'plastic', 'organic', 'fabric', 'wood', 'chemical', 'electronic', 'mixed'] },
                quantity: Number,
                unit: { type: String, enum: ['kg', 'ton'] },
                frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
                currentDisposal: { type: String, enum: ['landfill', 'recycling', 'sold', 'stored', 'other'] },
            }],
        },
        energyContext: {
            gridSource: { type: String, enum: ['coal_heavy', 'mixed', 'renewable_heavy', 'unknown'] },
            renewablePercentage: Number,
            peakHours: { start: Number, end: Number },
        },

        // Status
        onboardingStep: { type: Number, default: 0 },
        onboardingComplete: { type: Boolean, default: false },
        verificationStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'verified', 'suspended'],
            default: 'pending',
        },
        role: {
            type: String,
            enum: ['admin', 'operator', 'viewer'],
            default: 'admin',
        },
        lastLoginAt: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

companySchema.index({ location: '2dsphere' });
companySchema.index({ industry: 1, 'wasteStreams.type': 1 });
companySchema.index({ email: 1 }, { sparse: true });

companySchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = (this as any).name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }

    // Auto-calculate total employees
    if (this.isModified('employeeBreakdown')) {
        const eb = (this as any).employeeBreakdown;
        if (eb) {
            (this as any).totalEmployees = (eb.management || 0) + (eb.technical || 0) +
                (eb.skilled || 0) + (eb.unskilled || 0) + (eb.contract || 0);
        }
    }

    next();
});

// Virtual: grid type derived from provider
companySchema.virtual('derivedGridType').get(function () {
    const provider = (this as any).electricityProvider;
    if (!provider) return 'unknown';
    const map: Record<string, string> = {
        'PSPCL': 'coal_heavy',
        'MSEDCL': 'mixed',
        'Tata Power': 'mixed',
        'Adani': 'mixed',
        'BSES': 'mixed',
        'CESC': 'coal_heavy',
    };
    return map[provider] || 'mixed';
});

export const Company = mongoose.model<CompanyDocument>('Company', companySchema);
