import { MATERIAL_CATEGORIES, INDUSTRY_TYPES, REVENUE_RANGES } from '../utils/constants';

// ============ Shared Types ============

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];
export type IndustryType = typeof INDUSTRY_TYPES[number];
export type RevenueRange = typeof REVENUE_RANGES[number];

export interface GeoPoint {
    type: 'Point';
    coordinates: number[]; // [lng, lat]
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
}

// ============ Company ============

export interface ICompany {
    clerkUserId?: string;
    name: string;
    slug: string;
    email?: string;
    industry: IndustryType;
    subIndustry?: string;
    location: GeoPoint;
    facilitySize?: number;
    employeeCount?: number;
    annualRevenue?: RevenueRange;
    operatingHours?: {
        start: number;
        end: number;
        shifts?: Array<{ name: string; start: number; end: number }>;
    };
    baselineMetrics?: {
        monthlyElectricityKwh?: number;
        monthlyFuelLiters?: { diesel?: number; petrol?: number; lpg?: number };
        monthlyFuelKg?: { naturalGas?: number; coal?: number };
        monthlyWaterLiters?: number;
        wasteStreams?: Array<{
            type: MaterialCategory;
            quantity: number;
            unit: 'kg' | 'ton';
            frequency: 'daily' | 'weekly' | 'monthly';
            currentDisposal: 'landfill' | 'recycling' | 'sold' | 'stored' | 'other';
        }>;
    };
    energyContext?: {
        gridSource?: 'coal_heavy' | 'mixed' | 'renewable_heavy' | 'unknown';
        renewablePercentage?: number;
        peakHours?: { start: number; end: number };
    };
    onboardingComplete: boolean;
    verificationStatus: 'pending' | 'verified' | 'suspended';
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}

// ============ Waste Listing ============

export interface IWasteListing {
    companyId: string;
    listedBy?: string;
    material: {
        category: MaterialCategory;
        subType?: string;
        chemicalComposition?: string;
        hazardous: boolean;
        msdsAvailable?: boolean;
    };
    quantity: {
        value: number;
        unit: 'kg' | 'ton' | 'liter' | 'cubic_meter';
        frequency: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
        availableFrom?: Date;
        availableUntil?: Date;
    };
    quality: {
        grade?: 'industrial' | 'commercial' | 'mixed' | 'contaminated';
        condition?: 'clean' | 'sorted' | 'mixed' | 'requires_processing';
        description?: string;
        images?: string[];
        certificates?: Array<{ type: string; url: string }>;
    };
    pricing: {
        type: 'fixed' | 'negotiable' | 'auction' | 'free';
        amount?: number;
        currency: string;
        minimumOrder?: number;
        bulkDiscount?: { threshold: number; percentage: number };
    };
    logistics: {
        pickupAvailable: boolean;
        deliveryAvailable: boolean;
        pickupRadiusKm?: number;
        packagingIncluded?: boolean;
        loadingAssistance?: boolean;
    };
    location: GeoPoint;
    status: 'draft' | 'active' | 'negotiating' | 'reserved' | 'completed' | 'expired' | 'withdrawn';
    viewCount: number;
    inquiryCount: number;
    matchCount: number;
    autoRelist: boolean;
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

// ============ Need Listing ============

export interface INeedListing {
    companyId: string;
    requirements: {
        material: {
            category: MaterialCategory;
            subTypes?: string[];
            excludedTypes?: string[];
            quality?: 'any' | 'industrial' | 'commercial';
            hazardousAcceptable: boolean;
        };
        quantity: {
            min: number;
            max: number;
            unit: string;
            frequency: string;
            flexibility: 'strict' | 'flexible' | 'spot_purchase';
        };
        budget: {
            maxPricePerUnit: number;
            currency: string;
            totalBudget?: number;
            negotiationRoom?: number;
        };
    };
    logistics: {
        maxDistanceKm: number;
        pickupRequired?: boolean;
        preferredRegions?: string[];
        excludedRegions?: string[];
    };
    urgency: 'immediate' | 'this_month' | 'this_quarter' | 'ongoing';
    status: 'active' | 'fulfilled' | 'paused' | 'expired';
    matchingPreferences: {
        prioritizeDistance: number;
        prioritizePrice: number;
        prioritizeQuality: number;
        prioritizeReliability: number;
    };
    createdAt: Date;
    expiresAt?: Date;
}

// ============ Match ============

export interface IMatch {
    wasteListingId: string;
    needListingId: string;
    sellerId: string;
    buyerId: string;
    matchScore: number;
    matchFactors: {
        materialCompatibility: number;
        quantityFit: number;
        priceCompatibility: number;
        distanceScore: number;
        reliabilityScore: number;
    };
    aiAnalysis?: {
        explanation: string;
        confidence: number;
        riskFactors: string[];
        opportunities: string[];
    };
    predictedImpact?: {
        co2SavedKg: number;
        waterSavedLiters: number;
        landfillAvoidedM3: number;
        energySavedKwh: number;
        economicValue: number;
        methodology: string;
    };
    negotiation: {
        status: 'pending' | 'in_progress' | 'accepted' | 'rejected' | 'expired';
        proposedPrice?: number;
        proposedQuantity?: number;
        proposedPickupDate?: Date;
        messages: Array<{
            from: string;
            message: string;
            timestamp: Date;
            attachments?: string[];
        }>;
        acceptedAt?: Date;
        acceptedBy?: string;
    };
    execution: {
        status: 'not_started' | 'pickup_scheduled' | 'in_transit' | 'delivered' | 'verified' | 'disputed' | 'completed';
        pickupScheduledAt?: Date;
        actualPickupAt?: Date;
        deliveredAt?: Date;
        verifiedAt?: Date;
        trackingCode?: string;
        logisticsProvider?: string;
        proofOfDelivery?: string[];
        buyerVerification?: { approved: boolean; notes: string; at: Date };
        sellerVerification?: { approved: boolean; notes: string; at: Date };
    };
    actualImpact?: {
        co2SavedKg: number;
        waterSavedLiters: number;
        landfillAvoidedM3: number;
        energySavedKwh: number;
        transportEmissionsKg: number;
        netCo2Saved: number;
        economicValueRealized: number;
    };
    passportId?: string;
    financials: {
        platformFee?: number;
        sellerEarnings?: number;
        buyerSavings?: number;
        paymentStatus: 'pending' | 'held' | 'released' | 'refunded';
        invoiceUrl?: string;
    };
    ratings?: {
        sellerRating?: number;
        buyerRating?: number;
        sellerReview?: string;
        buyerReview?: string;
        sellerWouldRecommend?: boolean;
        buyerWouldRecommend?: boolean;
    };
    statusHistory: Array<{
        status: string;
        changedAt: Date;
        changedBy?: string;
        reason?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

// ============ Product Passport ============

export interface IProductPassport {
    passportNumber: string;
    origin: {
        companyId: string;
        companyName: string;
        location: { coordinates: number[]; address: string };
        materialType: string;
        quantity: number;
        unit: string;
        date: Date;
        batchId?: string;
        qualityCertifications?: string[];
    };
    journey: {
        transport: {
            mode: 'truck' | 'rail' | 'ship' | 'pipeline';
            distanceKm: number;
            emissionsKg: number;
            carrier?: string;
            trackingEvents?: Array<{
                timestamp: Date;
                location: number[];
                status: string;
                proof?: string;
            }>;
        };
        processing?: Array<{
            facility: string;
            process: string;
            date: Date;
            emissionsKg: number;
            outputQuantity: number;
        }>;
    };
    destination: {
        companyId: string;
        companyName: string;
        location: { coordinates: number[]; address: string };
        application?: string;
        date: Date;
    };
    impact: {
        co2SavedVsVirgin: number;
        waterSavedLiters: number;
        energySavedKwh: number;
        landfillAvoidedM3: number;
        virginMaterialEquivalent?: number;
        methodology: string;
        verifiedBy?: string;
        verificationDate?: Date;
    };
    blockchain: {
        network: 'ethereum' | 'polygon' | 'hyperledger' | 'none';
        transactionHash?: string;
        blockNumber?: number;
        anchorTimestamp?: Date;
    };
    verification: {
        qrCode?: string;
        status: 'pending' | 'verified' | 'disputed' | 'revoked';
        auditors?: Array<{ organization: string; date: Date; result: string }>;
        documents?: Array<{ type: string; url: string; hash: string }>;
    };
    publicUrl: string;
    matchId: string;
    createdAt: Date;
}

// ============ Impact Analytics ============

export interface IImpactAnalytics {
    companyId: string;
    date: Date;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    inputs: {
        electricityKwh?: number;
        fuelLiters?: { diesel?: number; petrol?: number; lpg?: number };
        fuelKg?: { naturalGas?: number; coal?: number };
        waterLiters?: number;
        rawMaterialsTons?: number;
    };
    emissions: {
        scope1: number;
        scope2: number;
        scope3: number;
        totalCo2e: number;
        breakdown: {
            coal?: number;
            electricity?: number;
            diesel?: number;
            naturalGas?: number;
            waste?: number;
            transport?: number;
        };
    };
    waste: {
        generated?: number;
        landfilled?: number;
        recycled?: number;
        exchanged?: number;
        exchangedValue?: number;
    };
    efficiency: {
        carbonIntensity?: number;
        energyIntensity?: number;
        circularityRate?: number;
        waterEfficiency?: number;
    };
    benchmarks?: {
        industryAverage?: number;
        percentile?: number;
        trend?: 'improving' | 'stable' | 'worsening';
    };
    insights?: Array<{
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
        recommendation: string;
        potentialSavings?: number;
    }>;
    createdAt: Date;
}

// ============ Email Log ============

export interface IEmailLog {
    matchId?: string;
    type: string;
    recipient: string;
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed' | 'bounced';
    error?: string;
}

// ============ API Types ============

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface AuthUser {
    userId: string;
    companyId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
