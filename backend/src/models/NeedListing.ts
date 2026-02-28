import mongoose, { Schema, Document } from 'mongoose';

export interface NeedListingDocument extends Document {
    companyId: any;
    requirements: any;
    logistics: any;
    urgency: string;
    status: string;
    matchingPreferences: any;
    createdAt: Date;
    expiresAt?: Date;
}

const needListingSchema = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        requirements: {
            material: {
                category: {
                    type: String,
                    enum: ['metal_scrap', 'plastic', 'organic', 'fabric', 'wood', 'chemical', 'electronic', 'construction', 'mixed'],
                    required: true,
                },
                subTypes: [String],
                excludedTypes: [String],
                quality: { type: String, enum: ['any', 'industrial', 'commercial'] },
                hazardousAcceptable: { type: Boolean, default: false },
            },
            quantity: {
                min: { type: Number, required: true },
                max: { type: Number, required: true },
                unit: { type: String, required: true },
                frequency: String,
                flexibility: { type: String, enum: ['strict', 'flexible', 'spot_purchase'], default: 'flexible' },
            },
            budget: {
                maxPricePerUnit: { type: Number, required: true },
                currency: { type: String, default: 'INR' },
                totalBudget: Number,
                negotiationRoom: Number,
            },
        },
        logistics: {
            maxDistanceKm: { type: Number, default: 100 },
            pickupRequired: Boolean,
            preferredRegions: [String],
            excludedRegions: [String],
        },
        urgency: {
            type: String,
            enum: ['immediate', 'this_month', 'this_quarter', 'ongoing'],
            default: 'ongoing',
        },
        status: {
            type: String,
            enum: ['active', 'fulfilled', 'paused', 'expired'],
            default: 'active',
        },
        matchingPreferences: {
            prioritizeDistance: { type: Number, default: 0.3 },
            prioritizePrice: { type: Number, default: 0.3 },
            prioritizeQuality: { type: Number, default: 0.2 },
            prioritizeReliability: { type: Number, default: 0.2 },
        },
        expiresAt: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

needListingSchema.index({ status: 1, 'requirements.material.category': 1, companyId: 1 });

export const NeedListing = mongoose.model<NeedListingDocument>('NeedListing', needListingSchema);
