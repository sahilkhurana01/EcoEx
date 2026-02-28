import mongoose, { Schema, Document } from 'mongoose';

export interface EmailLogDocument extends Document {
    matchId?: any;
    type: string;
    recipient: string;
    sentAt: Date;
    status: string;
    error?: string;
}

const emailLogSchema = new Schema(
    {
        matchId: { type: Schema.Types.ObjectId, ref: 'Match', index: true },
        type: { type: String, required: true, index: true },
        recipient: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['sent', 'delivered', 'failed', 'bounced'],
            default: 'sent',
        },
        error: String,
    },
    { timestamps: true }
);

emailLogSchema.index({ sentAt: -1 });

export const EmailLog = mongoose.model<EmailLogDocument>('EmailLog', emailLogSchema);
