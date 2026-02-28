import mongoose, { Schema, Document } from 'mongoose';

export interface SuggestionDocument extends Document {
    companyId: string;
    predictionId?: string;
    category: 'energy_efficiency' | 'fuel_switching' | 'waste_valorization' | 'process_optimization' | 'water_efficiency';
    title: string;
    description: string;
    implementationSteps: string[];
    complexity: 'low' | 'medium' | 'high';
    investmentInr: number | null;
    annualSavings: {
        co2Kg: number;
        inr: number;
    };
    paybackMonths: number | null;
    priorityRank: number;
    impactScore: number; // 0-100
    status: 'new' | 'saved' | 'in_progress' | 'done' | 'dismissed';
    source: 'groq' | 'rules_engine' | 'anomaly';
    metadata?: {
        prompt?: string;
        model?: string;
        generatedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const suggestionSchema = new Schema(
    {
        companyId: { type: String, required: true, index: true },
        predictionId: String,
        category: {
            type: String,
            enum: ['energy_efficiency', 'fuel_switching', 'waste_valorization', 'process_optimization', 'water_efficiency'],
            required: true,
        },
        title: { type: String, required: true },
        description: { type: String, required: true },
        implementationSteps: [String],
        complexity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        investmentInr: { type: Number, default: null },
        annualSavings: {
            co2Kg: { type: Number, default: 0 },
            inr: { type: Number, default: 0 },
        },
        paybackMonths: { type: Number, default: null },
        priorityRank: { type: Number, default: 0 },
        impactScore: { type: Number, min: 0, max: 100, default: 50 },
        status: {
            type: String,
            enum: ['new', 'saved', 'in_progress', 'done', 'dismissed'],
            default: 'new',
        },
        source: { type: String, enum: ['groq', 'rules_engine', 'anomaly'], default: 'groq' },
        metadata: {
            prompt: String,
            model: String,
            generatedAt: Date,
        },
    },
    { timestamps: true }
);

suggestionSchema.index({ companyId: 1, category: 1, status: 1 });
suggestionSchema.index({ companyId: 1, priorityRank: 1 });

export const Suggestion = mongoose.model<SuggestionDocument>('Suggestion', suggestionSchema);
