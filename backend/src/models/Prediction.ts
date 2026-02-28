import mongoose, { Schema, Document } from 'mongoose';

export interface PredictionDocument extends Document {
    companyId: string;
    type: 'emissions' | 'cost' | 'waste' | 'energy';
    scope: 'scope1' | 'scope2' | 'scope3' | 'total';
    methodology: string;
    inputHash: string;
    confidenceScore: number;

    // Current calculations
    currentEmissions: {
        totalCo2e: number;
        scope1: number;
        scope2: number;
        scope3: number;
        breakdown: {
            electricity: number;
            diesel: number;
            petrol: number;
            lpg: number;
            naturalGas: number;
            coal: number;
            biomass: number;
            furnaceOil: number;
            waste: number;
            supplyChain: number;
        };
        formulas: string[];
    };

    // Forecast
    forecasts: Array<{
        period: string;     // e.g., "2024-07"
        value: number;
        lower: number;
        upper: number;
    }>;
    annualProjection: {
        value: number;
        lower: number;
        upper: number;
    };
    peakPeriods: string[];
    trendDirection: 'improving' | 'stable' | 'worsening';

    // Fuzzy logic confidence
    dataQuality: {
        electricityConfidence: number;
        fuelConfidence: number;
        wasteConfidence: number;
        overallConfidence: number;
        flags: string[];
    };

    // Historical data used
    historicalData: number[];

    // Meta
    generatedAt: Date;
    expiresAt: Date;
    version: number;
}

const predictionSchema = new Schema(
    {
        companyId: { type: String, required: true, index: true },
        type: { type: String, enum: ['emissions', 'cost', 'waste', 'energy'], default: 'emissions' },
        scope: { type: String, enum: ['scope1', 'scope2', 'scope3', 'total'], default: 'total' },
        methodology: String,
        inputHash: String,
        confidenceScore: { type: Number, min: 0, max: 100 },

        currentEmissions: {
            totalCo2e: Number,
            scope1: Number,
            scope2: Number,
            scope3: Number,
            breakdown: {
                electricity: { type: Number, default: 0 },
                diesel: { type: Number, default: 0 },
                petrol: { type: Number, default: 0 },
                lpg: { type: Number, default: 0 },
                naturalGas: { type: Number, default: 0 },
                coal: { type: Number, default: 0 },
                biomass: { type: Number, default: 0 },
                furnaceOil: { type: Number, default: 0 },
                waste: { type: Number, default: 0 },
                supplyChain: { type: Number, default: 0 },
            },
            formulas: [String],
        },

        forecasts: [{
            period: String,
            value: Number,
            lower: Number,
            upper: Number,
        }],
        annualProjection: {
            value: Number,
            lower: Number,
            upper: Number,
        },
        peakPeriods: [String],
        trendDirection: { type: String, enum: ['improving', 'stable', 'worsening'] },

        dataQuality: {
            electricityConfidence: { type: Number, default: 60 },
            fuelConfidence: { type: Number, default: 60 },
            wasteConfidence: { type: Number, default: 60 },
            overallConfidence: { type: Number, default: 60 },
            flags: [String],
        },

        historicalData: [Number],

        generatedAt: { type: Date, default: Date.now },
        expiresAt: Date,
        version: { type: Number, default: 1 },
    },
    { timestamps: true }
);

predictionSchema.index({ companyId: 1, type: 1, generatedAt: -1 });

export const Prediction = mongoose.model<PredictionDocument>('Prediction', predictionSchema);
