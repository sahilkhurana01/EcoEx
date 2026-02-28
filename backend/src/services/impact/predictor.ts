import { ImpactAnalytics } from '../../models/ImpactAnalytics';
import { geminiService } from '../ai/gemini.service';
import { logger } from '../../utils/logger';

export class ImpactPredictor {
    /**
     * Predict future emissions using local trend analysis
     * Falls back to Gemini AI for more sophisticated predictions
     */
    async predictTrend(companyId: string, monthsAhead: number = 3): Promise<{
        predictions: Array<{
            month: string;
            predictedCo2: number;
            confidenceInterval: [number, number];
            trend: 'improving' | 'stable' | 'worsening';
        }>;
        trendSummary: string;
    }> {
        try {
            // Get historical data
            const historicalData = await ImpactAnalytics.find({
                companyId,
                period: 'monthly',
            })
                .sort({ date: -1 })
                .limit(12)
                .lean();

            if (historicalData.length < 3) {
                return {
                    predictions: [],
                    trendSummary: 'Insufficient data. Need at least 3 months of records.',
                };
            }

            // Simple linear regression for local prediction
            const co2Values = historicalData
                .reverse()
                .map((d) => d.emissions?.totalCo2e || 0);

            const predictions = [];
            const n = co2Values.length;
            const avgCo2 = co2Values.reduce((a, b) => a + b, 0) / n;

            // Calculate slope (linear trend)
            let sumXY = 0;
            let sumX2 = 0;
            const avgX = (n - 1) / 2;
            for (let i = 0; i < n; i++) {
                sumXY += (i - avgX) * (co2Values[i] - avgCo2);
                sumX2 += (i - avgX) * (i - avgX);
            }
            const slope = sumX2 !== 0 ? sumXY / sumX2 : 0;
            const intercept = avgCo2 - slope * avgX;

            // Standard deviation for confidence intervals
            const residuals = co2Values.map((v, i) => v - (intercept + slope * i));
            const stdDev = Math.sqrt(
                residuals.reduce((sum, r) => sum + r * r, 0) / n
            );

            // Determine trend
            const trendDirection = slope < -10 ? 'improving' as const
                : slope > 10 ? 'worsening' as const
                    : 'stable' as const;

            const lastDate = new Date(historicalData[historicalData.length - 1].date);

            for (let m = 1; m <= monthsAhead; m++) {
                const futureDate = new Date(lastDate);
                futureDate.setMonth(futureDate.getMonth() + m);
                const predicted = Math.max(0, Math.round(intercept + slope * (n + m - 1)));
                const margin = Math.round(stdDev * 1.96); // 95% CI

                predictions.push({
                    month: futureDate.toISOString().slice(0, 7), // YYYY-MM
                    predictedCo2: predicted,
                    confidenceInterval: [
                        Math.max(0, predicted - margin),
                        predicted + margin,
                    ] as [number, number],
                    trend: trendDirection,
                });
            }

            const trendSummary = trendDirection === 'improving'
                ? `Emissions trending downward at ~${Math.abs(Math.round(slope))} kg CO2/month. Keep up the momentum.`
                : trendDirection === 'worsening'
                    ? `Emissions trending upward at ~${Math.round(slope)} kg CO2/month. Review energy usage patterns.`
                    : `Emissions are stable around ${Math.round(avgCo2)} kg CO2/month.`;

            return { predictions, trendSummary };
        } catch (error) {
            logger.error('ImpactPredictor.predictTrend error:', error);
            return { predictions: [], trendSummary: 'Error computing predictions.' };
        }
    }

    /**
     * Calculate benchmarks vs industry peers
     */
    async calculateBenchmarks(companyId: string, industry: string): Promise<{
        industryAverage: number;
        percentile: number;
        trend: 'improving' | 'stable' | 'worsening';
        peerCount: number;
    }> {
        try {
            // Get all companies in the same industry
            const peerData = await ImpactAnalytics.aggregate([
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'companyId',
                        foreignField: '_id',
                        as: 'company',
                    },
                },
                { $unwind: '$company' },
                { $match: { 'company.industry': industry } },
                { $sort: { date: -1 } },
                {
                    $group: {
                        _id: '$companyId',
                        latestCo2: { $first: '$emissions.totalCo2e' },
                        latestCircularity: { $first: '$efficiency.circularityRate' },
                    },
                },
            ]);

            if (peerData.length === 0) {
                return { industryAverage: 0, percentile: 50, trend: 'stable', peerCount: 0 };
            }

            const co2Values = peerData.map((p) => p.latestCo2 || 0).sort((a, b) => a - b);
            const industryAverage = Math.round(
                co2Values.reduce((a, b) => a + b, 0) / co2Values.length
            );

            // Find the company's position
            const companyData = peerData.find((p) => p._id.toString() === companyId);
            const companyCo2 = companyData?.latestCo2 || industryAverage;

            // Calculate percentile (lower is better for CO2)
            const belowCount = co2Values.filter((v) => v > companyCo2).length;
            const percentile = Math.round((belowCount / co2Values.length) * 100);

            return {
                industryAverage,
                percentile,
                trend: percentile > 60 ? 'improving' : percentile < 40 ? 'worsening' : 'stable',
                peerCount: peerData.length,
            };
        } catch (error) {
            logger.error('ImpactPredictor.calculateBenchmarks error:', error);
            return { industryAverage: 0, percentile: 50, trend: 'stable', peerCount: 0 };
        }
    }
}

export const impactPredictor = new ImpactPredictor();
