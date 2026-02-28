import mongoose, { Schema, Document } from 'mongoose';

export interface WasteListingDocument extends Document {
    companyId: any;
    listedBy?: any;
    material: any;
    quantity: any;
    quality: any;
    pricing: any;
    logistics: any;
    location: any;
    status: string;
    viewCount: number;
    inquiryCount: number;
    matchCount: number;
    autoRelist: boolean;
    featured: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const wasteListingSchema = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        listedBy: { type: Schema.Types.ObjectId, ref: 'Company' },
        material: {
            category: {
                type: String,
                enum: ['metal_scrap', 'plastic', 'organic', 'fabric', 'wood', 'chemical', 'electronic', 'construction', 'mixed', 'energy_recovery'],
                required: true,
                index: true,
            },
            subType: String,
            chemicalComposition: String,
            hazardous: { type: Boolean, default: false },
            msdsAvailable: Boolean,
        },
        quantity: {
            value: { type: Number, required: true },
            unit: { type: String, enum: ['kg', 'ton', 'liter', 'cubic_meter'], required: true },
            frequency: { type: String, enum: ['one_time', 'daily', 'weekly', 'monthly', 'quarterly'], default: 'monthly' },
            availableFrom: Date,
            availableUntil: Date,
        },
        quality: {
            grade: { type: String, enum: ['industrial', 'commercial', 'mixed', 'contaminated'] },
            condition: { type: String, enum: ['clean', 'sorted', 'mixed', 'requires_processing'] },
            description: String,
            images: [String],
            certificates: [{ type: { type: String }, url: String }],
        },
        pricing: {
            type: { type: String, enum: ['fixed', 'negotiable', 'auction', 'free'], default: 'fixed' },
            amount: Number,
            currency: { type: String, default: 'INR' },
            minimumOrder: Number,
            bulkDiscount: { threshold: Number, percentage: Number },
        },
        logistics: {
            pickupAvailable: { type: Boolean, default: false },
            deliveryAvailable: { type: Boolean, default: false },
            pickupRadiusKm: Number,
            packagingIncluded: Boolean,
            loadingAssistance: Boolean,
        },
        location: {
            type: { type: String, default: 'Point', enum: ['Point'] },
            coordinates: { type: [Number], default: [0, 0] },
            address: String,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'negotiating', 'reserved', 'completed', 'expired', 'withdrawn'],
            default: 'draft',
            index: true,
        },
        viewCount: { type: Number, default: 0 },
        inquiryCount: { type: Number, default: 0 },
        matchCount: { type: Number, default: 0 },
        autoRelist: { type: Boolean, default: false },
        featured: { type: Boolean, default: false },
        expiresAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

wasteListingSchema.index({ status: 1, 'material.category': 1, location: '2dsphere' });
wasteListingSchema.index({ status: 1, companyId: 1, createdAt: -1 });
wasteListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const WasteListing = mongoose.model<WasteListingDocument>('WasteListing', wasteListingSchema);
