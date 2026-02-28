import mongoose, { Schema, Document } from 'mongoose';

// ─── Alert States ─────────────────────────────────────────
export type AlertStatus = 'monitoring' | 'triggered' | 'processing' | 'sent' | 'acknowledged' | 'resolved';
export type AlertSeverity = 'critical' | 'high' | 'medium';
export type AlertCategory = 'carbon' | 'energy' | 'waste' | 'cost' | 'compliance';

// ─── Alert Document ───────────────────────────────────────
export interface IAlert extends Document {
    companyId: mongoose.Types.ObjectId;
    alertType: string;
    category: AlertCategory;
    severity: AlertSeverity;
    status: AlertStatus;
    metric: string;
    currentValue: number;
    thresholdValue: number;
    unit: string;
    percentageExceeded: number;
    title: string;
    description: string;
    aiContent: {
        subject: string;
        previewText: string;
        htmlBody: string;
        generatedBy: 'groq' | 'gemini';
        generationTimeMs: number;
    };
    emailDelivery: {
        sentTo: string;
        sentAt: Date | null;
        openedAt: Date | null;
        clickedAt: Date | null;
        brevoMessageId: string | null;
    };
    context: {
        thirtyDayAvg: number | null;
        lastMonthValue: number | null;
        trend: 'increasing' | 'decreasing' | 'stable';
        industryPercentile: number | null;
        peerComparison: string | null;
    };
    simulated: boolean;
    simulatedBy: mongoose.Types.ObjectId | null;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    escalatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    alertType: { type: String, required: true },
    category: { type: String, enum: ['carbon', 'energy', 'waste', 'cost', 'compliance'], required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium'], required: true },
    status: {
        type: String,
        enum: ['monitoring', 'triggered', 'processing', 'sent', 'acknowledged', 'resolved'],
        default: 'triggered',
    },
    metric: { type: String, required: true },
    currentValue: { type: Number, required: true },
    thresholdValue: { type: Number, required: true },
    unit: { type: String, required: true },
    percentageExceeded: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    aiContent: {
        subject: { type: String, default: '' },
        previewText: { type: String, default: '' },
        htmlBody: { type: String, default: '' },
        generatedBy: { type: String, enum: ['groq', 'gemini'], default: 'groq' },
        generationTimeMs: { type: Number, default: 0 },
    },
    emailDelivery: {
        sentTo: { type: String, default: '' },
        sentAt: { type: Date, default: null },
        openedAt: { type: Date, default: null },
        clickedAt: { type: Date, default: null },
        brevoMessageId: { type: String, default: null },
    },
    context: {
        thirtyDayAvg: { type: Number, default: null },
        lastMonthValue: { type: Number, default: null },
        trend: { type: String, enum: ['increasing', 'decreasing', 'stable'], default: 'stable' },
        industryPercentile: { type: Number, default: null },
        peerComparison: { type: String, default: null },
    },
    simulated: { type: Boolean, default: false },
    simulatedBy: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
}, { timestamps: true });

// Index for duplicate prevention (4-hour window handled in service logic)
AlertSchema.index({ companyId: 1, alertType: 1, createdAt: -1 });
AlertSchema.index({ status: 1, createdAt: -1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);

// ─── Alert Settings ───────────────────────────────────────
export interface IAlertSettings extends Document {
    companyId: mongoose.Types.ObjectId;
    enabled: boolean;
    thresholds: {
        carbon: { enabled: boolean; emissionsBaselinePercent: number; dailySpikePercent: number; scope1MaxPercent: number };
        energy: { enabled: boolean; consumptionOverPercent: number; powerFactorMin: number; peakDemandPercent: number; renewableMinPercent: number };
        waste: { enabled: boolean; storageCapacityPercent: number; unlistedDays: number; organicMaxKg: number; untappedSavingsMin: number };
        cost: { enabled: boolean; billOverForecastPercent: number; fuelSpikePercent: number; disposalTrendPercent: number };
        compliance: { enabled: boolean; reportingDeadlineDays: number; missProbabilityPercent: number; renewalDays: number };
    };
    notifications: {
        email: boolean;
        inApp: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string; // "22:00"
        end: string;   // "07:00"
    };
    aiTone: 'urgent' | 'balanced' | 'gentle';
}

const AlertSettingsSchema = new Schema<IAlertSettings>({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    enabled: { type: Boolean, default: true },
    thresholds: {
        carbon: { enabled: { type: Boolean, default: true }, emissionsBaselinePercent: { type: Number, default: 110 }, dailySpikePercent: { type: Number, default: 25 }, scope1MaxPercent: { type: Number, default: 50 } },
        energy: { enabled: { type: Boolean, default: true }, consumptionOverPercent: { type: Number, default: 120 }, powerFactorMin: { type: Number, default: 0.85 }, peakDemandPercent: { type: Number, default: 90 }, renewableMinPercent: { type: Number, default: 20 } },
        waste: { enabled: { type: Boolean, default: true }, storageCapacityPercent: { type: Number, default: 80 }, unlistedDays: { type: Number, default: 7 }, organicMaxKg: { type: Number, default: 500 }, untappedSavingsMin: { type: Number, default: 50000 } },
        cost: { enabled: { type: Boolean, default: true }, billOverForecastPercent: { type: Number, default: 130 }, fuelSpikePercent: { type: Number, default: 20 }, disposalTrendPercent: { type: Number, default: 10 } },
        compliance: { enabled: { type: Boolean, default: true }, reportingDeadlineDays: { type: Number, default: 30 }, missProbabilityPercent: { type: Number, default: 60 }, renewalDays: { type: Number, default: 60 } },
    },
    notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
    },
    quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '07:00' },
    },
    aiTone: { type: String, enum: ['urgent', 'balanced', 'gentle'], default: 'balanced' },
}, { timestamps: true });

export const AlertSettings = mongoose.model<IAlertSettings>('AlertSettings', AlertSettingsSchema);

// ─── Simulation Log ───────────────────────────────────────
export interface ISimulationLog extends Document {
    userId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    alertType: string;
    severity: AlertSeverity;
    generatedEmail: {
        subject: string;
        htmlBody: string;
    };
    sentTo: string;
    alertId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SimulationLogSchema = new Schema<ISimulationLog>({
    userId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    alertType: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium'], required: true },
    generatedEmail: {
        subject: { type: String, default: '' },
        htmlBody: { type: String, default: '' },
    },
    sentTo: { type: String, required: true },
    alertId: { type: Schema.Types.ObjectId, ref: 'Alert' },
}, { timestamps: true });

SimulationLogSchema.index({ userId: 1, createdAt: -1 });

export const SimulationLog = mongoose.model<ISimulationLog>('SimulationLog', SimulationLogSchema);
