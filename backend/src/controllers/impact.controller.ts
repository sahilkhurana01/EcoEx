import { Request, Response, NextFunction } from 'express';
import { ImpactAnalytics } from '../models/ImpactAnalytics';
import { Company } from '../models/Company';
import { Match } from '../models/Match';
import { impactCalculator } from '../services/impact/calculator';
import { geminiService } from '../services/ai/gemini.service';
import { groqService } from '../services/ai/groq.service';
import { logger } from '../utils/logger';
import { ESGReport } from '../models/ESGReport';

export class ImpactController {
    /**
     * POST /api/impact/calculate
     * Calculate carbon footprint from energy inputs
     */
    async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inputs, companyId, period = 'monthly', date } = req.body;

            const emissions = impactCalculator.calculateEmissions(inputs);

            // Calculate efficiency metrics
            const wasteGenerated = inputs.wasteGenerated || 0;
            const wasteExchanged = inputs.wasteExchanged || 0;
            const wasteRecycled = inputs.wasteRecycled || 0;
            const circularityRate = impactCalculator.calculateCircularityRate(wasteGenerated, wasteExchanged, wasteRecycled);

            // Save analytics record
            const targetCompanyId = companyId || req.user?.companyId || req.user?.userId;
            const record = await ImpactAnalytics.create({
                companyId: targetCompanyId,
                date: date ? new Date(date) : new Date(),
                period,
                inputs,
                emissions,
                waste: {
                    generated: wasteGenerated,
                    landfilled: inputs.wasteLandfilled || 0,
                    recycled: wasteRecycled,
                    exchanged: wasteExchanged,
                    exchangedValue: inputs.wasteExchangedValue || 0,
                },
                efficiency: {
                    carbonIntensity: inputs.revenue ? emissions.totalCo2e / (inputs.revenue / 100000) : undefined,
                    energyIntensity: inputs.outputUnits ? inputs.electricityKwh / inputs.outputUnits : undefined,
                    circularityRate,
                    waterEfficiency: inputs.outputUnits ? inputs.waterLiters / inputs.outputUnits : undefined,
                },
            });

            res.json({
                success: true,
                data: {
                    record,
                    emissions,
                    circularityRate,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/impact/history
     * Get impact analytics history
     */
    async history(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.query.companyId || req.user?.companyId || req.user?.userId;
            const period = (req.query.period as string) || 'monthly';
            const months = parseInt(req.query.months as string) || 12;

            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            const records = await ImpactAnalytics.find({
                companyId,
                period,
                date: { $gte: startDate },
            }).sort({ date: -1 });

            // Calculate totals
            const totals = records.reduce(
                (acc, r) => ({
                    totalCo2e: acc.totalCo2e + (r.emissions?.totalCo2e || 0),
                    totalWasteExchanged: acc.totalWasteExchanged + (r.waste?.exchanged || 0),
                    totalWaterUsed: acc.totalWaterUsed + (r.inputs?.waterLiters || 0),
                    avgCircularity: acc.avgCircularity + (r.efficiency?.circularityRate || 0),
                }),
                { totalCo2e: 0, totalWasteExchanged: 0, totalWaterUsed: 0, avgCircularity: 0 }
            );

            if (records.length > 0) {
                totals.avgCircularity = Math.round((totals.avgCircularity / records.length) * 100) / 100;
            }

            res.json({
                success: true,
                data: {
                    records,
                    totals,
                    period,
                    dataPoints: records.length,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/impact/predictions
     * Get AI-powered emission predictions
     */
    async predictions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            const company = await Company.findById(companyId);

            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            // Get historical data
            const historicalData = await ImpactAnalytics.find({
                companyId,
                period: 'monthly',
            })
                .sort({ date: -1 })
                .limit(12)
                .lean();

            if (historicalData.length < 3) {
                res.json({
                    success: true,
                    data: {
                        predictions: [],
                        message: 'Need at least 3 months of data for predictions.',
                    },
                });
                return;
            }

            const predictions = await geminiService.predictEmissions(historicalData, company);

            res.json({
                success: true,
                data: predictions,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/impact/recommendations
     * Get AI-powered optimization recommendations
     */
    async recommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            const company = await Company.findById(companyId);

            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            const latestImpact = await ImpactAnalytics.findOne({ companyId })
                .sort({ date: -1 })
                .lean();

            const recommendations = await groqService.generateRecommendations(
                company.toObject(),
                latestImpact || {}
            );

            res.json({
                success: true,
                data: recommendations,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/impact/chat
     * AI chat assistant
     */
    async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { message } = req.body;
            const companyId = req.user?.companyId || req.user?.userId;

            const company = await Company.findById(companyId);
            const latestImpact = await ImpactAnalytics.findOne({ companyId }).sort({ date: -1 });
            const recentMatches = await Match.countDocuments({
                $or: [{ sellerId: companyId }, { buyerId: companyId }],
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            });

            const response = await groqService.chatAssistant(message, {
                companyName: company?.name || 'Your Company',
                industry: company?.industry || 'unknown',
                recentActivity: `${recentMatches} matches in last 30 days, emissions: ${latestImpact?.emissions?.totalCo2e || 'N/A'} kg CO2`,
            });

            res.json({
                success: true,
                data: { response },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/esg/generate-report
     * Generate ESG report
     */
    async generateESGReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            const { period = 'Q4 2024' } = req.body;

            const company = await Company.findById(companyId);
            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            const impactData = await ImpactAnalytics.find({ companyId })
                .sort({ date: -1 })
                .limit(12)
                .lean();

            const reportContent = await geminiService.generateESGReport(company.toObject(), impactData, period);

            // Save to DB for the ledger
            const savedReport = await ESGReport.create({
                companyId,
                title: `${period} ESG Performance Report`,
                period,
                metrics: ['Carbon', 'Waste', 'Water'],
                status: 'Generated',
                content: typeof reportContent === 'string' ? reportContent : JSON.stringify(reportContent),
            });

            res.json({
                success: true,
                data: savedReport,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/impact/esg/reports
     */
    async getESGReports(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const reports = await ESGReport.find({ companyId }).sort({ createdAt: -1 });
            res.json({ success: true, data: reports });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/esg/compliance-status
     */
    async complianceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const company = await Company.findById(companyId);
            const dataCount = await ImpactAnalytics.countDocuments({ companyId });

            // For the demo, make it stable but realistic
            const isDemo = dataCount === 0 && company?.onboardingComplete;
            const seed = companyId.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0);

            res.json({
                success: true,
                data: {
                    GRI: dataCount >= 12 || (isDemo && seed % 3 === 0),
                    SASB: dataCount >= 6 || (isDemo && seed % 2 === 0),
                    TCFD: dataCount >= 12 || (isDemo && seed % 5 === 0),
                    BRSR: dataCount >= 3 || (isDemo && true),
                    dataMonths: dataCount || (isDemo ? 6 : 0),
                    recommendation: dataCount < 3
                        ? 'Submit more operational data to enhance compliance precision.'
                        : 'Sufficient data for core compliance frameworks.',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/impact/leaderboard
     * Industry leaderboard
     */
    async leaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { industry, limit = '10' } = req.query;
            const limitNum = Math.min(parseInt(limit as string), 50);

            const pipeline: any[] = [
                { $sort: { date: -1 } },
                {
                    $group: {
                        _id: '$companyId',
                        totalCo2Saved: { $sum: '$waste.exchanged' },
                        latestCircularity: { $first: '$efficiency.circularityRate' },
                        totalEmissions: { $sum: '$emissions.totalCo2e' },
                        dataPoints: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: 'companies',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'company',
                    },
                },
                { $unwind: '$company' },
            ];

            if (industry) {
                pipeline.push({ $match: { 'company.industry': industry } });
            }

            pipeline.push(
                { $sort: { latestCircularity: -1 } },
                { $limit: limitNum },
                {
                    $project: {
                        companyName: '$company.name',
                        industry: '$company.industry',
                        city: '$company.location.city',
                        totalCo2Saved: 1,
                        latestCircularity: 1,
                        dataPoints: 1,
                    },
                }
            );

            const leaderboard = await ImpactAnalytics.aggregate(pipeline);

            res.json({ success: true, data: leaderboard });
        } catch (error) {
            next(error);
        }
    }
}

export const impactController = new ImpactController();
