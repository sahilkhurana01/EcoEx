import { Alert, AlertSettings, SimulationLog, AlertSeverity, AlertCategory } from '../../models/Alert';
import { Company } from '../../models/Company';
import { aiEmailGeneratorService, SIMULATION_SCENARIOS } from './aiEmailGenerator.service';
import { brevoService } from '../notifications/brevo.service';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';

export interface TriggerAlertParams {
    companyId: string;
    alertType: string;
    category: AlertCategory;
    severity: AlertSeverity;
    metric: string;
    currentValue: number;
    thresholdValue: number;
    unit: string;
    title: string;
    description: string;
    isSimulation?: boolean;
    simulatedBy?: string;
}

export class AlertOrchestratorService {

    /**
     * Core method to trigger an alert (real or simulated)
     * Handles AI generation, DB record, and Email delivery
     */
    async triggerAlert(params: TriggerAlertParams) {
        const { companyId, alertType, category, severity, metric, currentValue, thresholdValue, unit, title, description, isSimulation = false, simulatedBy } = params;

        // 1. Fetch data context
        const [company, settings] = await Promise.all([
            Company.findById(companyId).lean() as any,
            this.getSettings(companyId)
        ]);

        if (!company) throw new Error('Company not found');

        const percentageExceeded = Math.round(((currentValue - thresholdValue) / Math.max(1, thresholdValue)) * 100);
        const loc = company.location;
        const locationStr = (loc?.city) || (loc?.state) || (loc?.address) || 'India';

        // 2. Generate AI Email
        const aiResult = await aiEmailGeneratorService.generateAlertEmail({
            alertType,
            severity,
            companyName: company.name,
            industry: company.industry || 'Manufacturing',
            location: locationStr,
            metric,
            currentValue: `${currentValue.toLocaleString('en-IN')} ${unit}`,
            threshold: `${thresholdValue.toLocaleString('en-IN')} ${unit}`,
            percentageExceeded: Math.abs(percentageExceeded),
            thirtyDayAvg: `${Math.round(currentValue * 0.9).toLocaleString('en-IN')} ${unit}`, // Fallback context
            lastMonthValue: `${Math.round(currentValue * 0.85).toLocaleString('en-IN')} ${unit}`,
            trend: percentageExceeded > 0 ? 'increasing' : 'stable',
            recommendations: [
                'Review recent operational changes for potential waste sources',
                'Optimize machinery schedules to reduce peak demand',
                'Engage with EcoExchange marketplace for circular opportunities'
            ],
            industryPercentile: 75,
            peerCount: 12,
            adminName: company.name,
            aiTone: settings?.aiTone || 'balanced',
            isSimulation,
            simulatedBy: simulatedBy || (isSimulation ? company.name : undefined),
            description: description
        });

        let recipientEmail = company.email || company.contactPerson?.email || '';

        // --- EMAIL RESILIENCY ---
        // If no email found on company, and this is a simulation or we have no other choice,
        // we should not just crash. 
        if (!recipientEmail) {
            logger.warn(`⚠️ No email found for company ${company.name}. Attempting fallback to sender email.`);
            const { env: configEnv } = require('../../config/env');
            recipientEmail = configEnv.BREVO_SENDER_EMAIL || 'khuranasahil099@gmail.com'; // Use a hardcoded fallback if env fails
        }

        if (!recipientEmail) {
            logger.error(`❌ Still no recipient email found for company ${company.name}. Skipping email delivery.`);
            // We continue creating the alert record so it shows up in dashboard, but skip sending
        }

        // 3. Create Alert Record
        const alert = await Alert.create({
            companyId,
            alertType,
            category,
            severity,
            status: 'processing',
            metric,
            currentValue,
            thresholdValue,
            unit,
            percentageExceeded: Math.abs(percentageExceeded),
            title,
            description,
            aiContent: {
                subject: aiResult.subject,
                previewText: aiResult.previewText,
                htmlBody: aiResult.htmlBody,
                generatedBy: aiResult.generatedBy,
                generationTimeMs: aiResult.generationTimeMs,
            },
            context: {
                thirtyDayAvg: Math.round(currentValue * 0.9),
                lastMonthValue: Math.round(currentValue * 0.85),
                trend: percentageExceeded > 0 ? 'increasing' : 'stable',
                industryPercentile: 75,
                peerComparison: 'Optimizing could save 12% vs industry peers',
            },
            simulated: isSimulation,
            simulatedBy: isSimulation ? companyId : null,
        });

        // 4. Send Email
        let messageId = null;
        if (recipientEmail) {
            try {
                messageId = await brevoService.sendAlertEmail(recipientEmail, aiResult.subject, aiResult.htmlBody);
                alert.status = 'sent';
                alert.emailDelivery = {
                    sentTo: recipientEmail,
                    sentAt: new Date(),
                    openedAt: null,
                    clickedAt: null,
                    brevoMessageId: messageId,
                };
                await alert.save();
            } catch (emailError: any) {
                logger.error('Failed to send alert email:', { message: emailError.message });
                alert.status = 'triggered';
                await alert.save();
            }
        } else {
            alert.status = 'triggered';
            await alert.save();
        }

        return {
            alertId: (alert._id as mongoose.Types.ObjectId).toString(),
            emailSubject: aiResult.subject,
            sentTo: recipientEmail || 'Not Sent',
            generationTimeMs: aiResult.generationTimeMs,
            generatedBy: aiResult.generatedBy,
            brevoMessageId: messageId
        };
    }

    /**
     * Execute a full simulation workflow
     */
    async runSimulation(params: {
        companyId: string;
        alertType: string;
        severity: AlertSeverity;
        customMessage?: string;
    }) {
        const { companyId, alertType, severity, customMessage } = params;
        const scenario = SIMULATION_SCENARIOS[alertType];
        if (!scenario) throw new Error(`Unknown alert type: ${alertType}`);

        const currentValue = alertType === 'missed_opportunity' ? 100000 : (alertType === 'compliance_risk' ? scenario.baseline : Math.round(scenario.baseline * scenario.currentMultiplier));
        const thresholdValue = alertType === 'missed_opportunity' ? 50000 : (alertType === 'compliance_risk' ? 30 : Math.round(scenario.baseline * scenario.thresholdMultiplier));

        const result = await this.triggerAlert({
            companyId,
            alertType,
            category: scenario.category as AlertCategory,
            severity,
            metric: scenario.metric,
            currentValue,
            thresholdValue,
            unit: scenario.unit,
            title: scenario.title,
            description: customMessage || scenario.description,
            isSimulation: true,
            simulatedBy: companyId
        });

        // Log simulation
        await SimulationLog.create({
            userId: companyId,
            companyId,
            alertType,
            severity,
            generatedEmail: {
                subject: result.emailSubject,
                htmlBody: 'See alert record', // body is large, stored in Alert model
            },
            sentTo: result.sentTo,
            alertId: result.alertId,
        });

        return {
            ...result,
            success: true
        };
    }

    async canSimulate(companyId: string): Promise<{ allowed: boolean; remaining: number }> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await SimulationLog.countDocuments({
            companyId,
            createdAt: { $gte: oneHourAgo },
        });
        return { allowed: count < 5, remaining: Math.max(0, 5 - count) };
    }

    async getAlertHistory(companyId: string, options: { page?: number; limit?: number; category?: string; severity?: string; status?: string } = {}) {
        const { page = 1, limit = 20, category, severity, status } = options;
        const filter: any = { companyId };
        if (category) filter.category = category;
        if (severity) filter.severity = severity;
        if (status) filter.status = status;

        const [alerts, total] = await Promise.all([
            Alert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Alert.countDocuments(filter),
        ]);

        return { alerts, total, page, pages: Math.ceil(total / limit) };
    }

    async getRecentAlerts(companyId: string, limit = 5): Promise<any[]> {
        return Alert.find({ companyId, status: { $in: ['triggered', 'sent'] } }).sort({ createdAt: -1 }).limit(limit).lean();
    }

    async getUnreadCount(companyId: string): Promise<number> {
        return Alert.countDocuments({ companyId, status: { $in: ['triggered', 'sent'] }, acknowledgedAt: null });
    }

    async acknowledgeAlert(alertId: string, companyId: string): Promise<any> {
        const alert = await Alert.findOneAndUpdate({ _id: alertId, companyId }, { status: 'acknowledged', acknowledgedAt: new Date() }, { new: true });
        if (!alert) throw new Error('Alert not found');
        return alert;
    }

    async acknowledgeAll(companyId: string): Promise<number> {
        const result = await Alert.updateMany({ companyId, acknowledgedAt: null, status: { $in: ['triggered', 'sent'] } }, { status: 'acknowledged', acknowledgedAt: new Date() });
        return result.modifiedCount;
    }

    async getSettings(companyId: string): Promise<any> {
        let settings = await AlertSettings.findOne({ companyId }).lean();
        if (!settings) {
            const created = await AlertSettings.create({ companyId });
            settings = created.toObject() as any;
        }
        return settings;
    }

    async updateSettings(companyId: string, updates: any): Promise<any> {
        return AlertSettings.findOneAndUpdate({ companyId }, { $set: updates }, { new: true, upsert: true }).lean();
    }
}

export const alertOrchestratorService = new AlertOrchestratorService();
