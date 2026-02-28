import mongoose, { Schema, Document } from 'mongoose';

export interface ProductPassportDocument extends Document {
    passportNumber: string;
    origin: any;
    journey: any;
    destination: any;
    impact: any;
    blockchain: any;
    verification: any;
    publicUrl: string;
    matchId: any;
    createdAt: Date;
}

const productPassportSchema = new Schema(
    {
        passportNumber: { type: String, unique: true, required: true, index: true },
        origin: {
            companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
            companyName: { type: String, required: true },
            location: { coordinates: [Number], address: String },
            materialType: { type: String, required: true },
            quantity: { type: Number, required: true },
            unit: { type: String, required: true },
            date: { type: Date, required: true },
            batchId: String,
            qualityCertifications: [String],
        },
        journey: {
            transport: {
                mode: { type: String, enum: ['truck', 'rail', 'ship', 'pipeline'], default: 'truck' },
                distanceKm: Number,
                emissionsKg: Number,
                carrier: String,
                trackingEvents: [{ timestamp: Date, location: [Number], status: String, proof: String }],
            },
            processing: [{ facility: String, process: String, date: Date, emissionsKg: Number, outputQuantity: Number }],
        },
        destination: {
            companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
            companyName: { type: String, required: true },
            location: { coordinates: [Number], address: String },
            application: String,
            date: { type: Date, required: true },
        },
        impact: {
            co2SavedVsVirgin: { type: Number, required: true },
            waterSavedLiters: { type: Number, required: true },
            energySavedKwh: { type: Number, required: true },
            landfillAvoidedM3: { type: Number, required: true },
            virginMaterialEquivalent: Number,
            methodology: { type: String, required: true },
            verifiedBy: String,
            verificationDate: Date,
        },
        blockchain: {
            network: { type: String, enum: ['ethereum', 'polygon', 'hyperledger', 'none'], default: 'none' },
            transactionHash: String,
            blockNumber: Number,
            anchorTimestamp: Date,
        },
        verification: {
            qrCode: String,
            status: { type: String, enum: ['pending', 'verified', 'disputed', 'revoked'], default: 'pending' },
            auditors: [{ organization: String, date: Date, result: String }],
            documents: [{ type: { type: String }, url: String, hash: String }],
        },
        publicUrl: { type: String, unique: true },
        matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

export const ProductPassport = mongoose.model<ProductPassportDocument>('ProductPassport', productPassportSchema);
