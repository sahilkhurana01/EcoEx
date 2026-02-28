import mongoose, { Schema, Document } from 'mongoose';

export interface MatchDocument extends Document {
    wasteListingId: any;
    needListingId: any;
    sellerId: any;
    buyerId: any;
    matchScore: number;
    matchFactors: any;
    aiAnalysis?: any;
    predictedImpact?: any;
    negotiation: any;
    execution: any;
    actualImpact?: any;
    passportId?: any;
    financials: any;
    ratings?: any;
    statusHistory: any[];
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const matchSchema = new Schema(
    {
        wasteListingId: { type: Schema.Types.ObjectId, ref: 'WasteListing', required: true, index: true },
        needListingId: { type: Schema.Types.ObjectId, ref: 'NeedListing', required: true },
        sellerId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        buyerId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        matchScore: { type: Number, min: 0, max: 100, required: true, index: true },
        matchFactors: {
            materialCompatibility: Number,
            quantityFit: Number,
            priceCompatibility: Number,
            distanceScore: Number,
            reliabilityScore: Number,
        },
        aiAnalysis: {
            explanation: String,
            confidence: Number,
            riskFactors: [String],
            opportunities: [String],
        },
        predictedImpact: {
            co2SavedKg: Number,
            waterSavedLiters: Number,
            landfillAvoidedM3: Number,
            energySavedKwh: Number,
            economicValue: Number,
            methodology: String,
        },
        negotiation: {
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'accepted', 'rejected', 'expired'],
                default: 'pending',
            },
            proposedPrice: Number,
            proposedQuantity: Number,
            proposedPickupDate: Date,
            messages: [
                {
                    from: { type: Schema.Types.ObjectId, ref: 'Company' },
                    message: String,
                    timestamp: { type: Date, default: Date.now },
                    attachments: [String],
                },
            ],
            acceptedAt: Date,
            acceptedBy: { type: Schema.Types.ObjectId, ref: 'Company' },
        },
        execution: {
            status: {
                type: String,
                enum: ['not_started', 'pickup_scheduled', 'in_transit', 'delivered', 'verified', 'disputed', 'completed'],
                default: 'not_started',
            },
            pickupScheduledAt: Date,
            actualPickupAt: Date,
            deliveredAt: Date,
            verifiedAt: Date,
            trackingCode: String,
            logisticsProvider: String,
            proofOfDelivery: [String],
            buyerVerification: { approved: Boolean, notes: String, at: Date },
            sellerVerification: { approved: Boolean, notes: String, at: Date },
        },
        actualImpact: {
            co2SavedKg: Number,
            waterSavedLiters: Number,
            landfillAvoidedM3: Number,
            energySavedKwh: Number,
            transportEmissionsKg: Number,
            netCo2Saved: Number,
            economicValueRealized: Number,
        },
        passportId: { type: Schema.Types.ObjectId, ref: 'ProductPassport' },
        financials: {
            platformFee: Number,
            sellerEarnings: Number,
            buyerSavings: Number,
            paymentStatus: {
                type: String,
                enum: ['pending', 'held', 'released', 'refunded'],
                default: 'pending',
            },
            invoiceUrl: String,
        },
        ratings: {
            sellerRating: { type: Number, min: 1, max: 5 },
            buyerRating: { type: Number, min: 1, max: 5 },
            sellerReview: String,
            buyerReview: String,
            sellerWouldRecommend: Boolean,
            buyerWouldRecommend: Boolean,
        },
        statusHistory: [
            {
                status: String,
                changedAt: { type: Date, default: Date.now },
                changedBy: { type: Schema.Types.ObjectId, ref: 'Company' },
                reason: String,
            },
        ],
        completedAt: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

matchSchema.index({ sellerId: 1, 'negotiation.status': 1, createdAt: -1 });
matchSchema.index({ buyerId: 1, 'negotiation.status': 1, createdAt: -1 });
matchSchema.index({ matchScore: -1, 'negotiation.status': 1 });
matchSchema.index({ 'negotiation.status': 1, createdAt: 1 });

export const Match = mongoose.model<MatchDocument>('Match', matchSchema);
