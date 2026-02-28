import mongoose, { Schema, Document } from 'mongoose';

export interface ESGReportDocument extends Document {
    companyId: mongoose.Types.ObjectId;
    title: string;
    period: string;
    metrics: string[];
    status: 'Generated' | 'Sent';
    content: string;
    downloadUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const esgReportSchema = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        title: { type: String, required: true },
        period: { type: String, required: true },
        metrics: [{ type: String }],
        status: {
            type: String,
            enum: ['Generated', 'Sent'],
            default: 'Generated'
        },
        content: { type: String, required: true },
        downloadUrl: { type: String },
    },
    {
        timestamps: true,
    }
);

export const ESGReport = mongoose.model<ESGReportDocument>('ESGReport', esgReportSchema);
