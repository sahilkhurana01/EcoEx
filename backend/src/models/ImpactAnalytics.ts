import mongoose, { Schema, Document } from 'mongoose';
import { IImpactAnalytics } from '../types';

export interface ImpactAnalyticsDocument extends Document {
    companyId: any;
    date: Date;
    period: string;
    inputs: any;
    emissions: any;
    waste: any;
    efficiency: any;
    benchmarks: any;
    insights: any[];
    createdAt: Date;
}

const impactAnalyticsSchema = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        date: { type: Date, required: true },
        period: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
            required: true,
        },
        inputs: {
            electricityKwh: Number,
            fuelLiters: { diesel: Number, petrol: Number, lpg: Number },
            fuelKg: { naturalGas: Number, coal: Number },
            waterLiters: Number,
            rawMaterialsTons: Number,
        },
        emissions: {
            scope1: { type: Number, default: 0 },
            scope2: { type: Number, default: 0 },
            scope3: { type: Number, default: 0 },
            totalCo2e: { type: Number, default: 0 },
            breakdown: {
                coal: Number,
                electricity: Number,
                diesel: Number,
                naturalGas: Number,
                waste: Number,
                transport: Number,
            },
        },
        waste: {
            generated: Number,
            landfilled: Number,
            recycled: Number,
            exchanged: Number,
            exchangedValue: Number,
        },
        efficiency: {
            carbonIntensity: Number,
            energyIntensity: Number,
            circularityRate: Number,
            waterEfficiency: Number,
        },
        benchmarks: {
            industryAverage: Number,
            percentile: Number,
            trend: { type: String, enum: ['improving', 'stable', 'worsening'] },
        },
        insights: [
            {
                type: String,
                severity: { type: String, enum: ['info', 'warning', 'critical'] },
                message: String,
                recommendation: String,
                potentialSavings: Number,
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Time-series indexes
impactAnalyticsSchema.index({ companyId: 1, date: -1, period: 1 });
impactAnalyticsSchema.index({ 'emissions.totalCo2e': -1 }); // Leaderboards

export const ImpactAnalytics = mongoose.model<ImpactAnalyticsDocument>('ImpactAnalytics', impactAnalyticsSchema);
