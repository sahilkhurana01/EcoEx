import { WasteListing } from '../../models/WasteListing';
import { NeedListing, NeedListingDocument } from '../../models/NeedListing';
import { Match } from '../../models/Match';
import { Company } from '../../models/Company';
import { calculateDistance } from '../../utils/geospatial';
import { impactCalculator } from '../impact/calculator';
import { groqService } from '../ai/groq.service';
import { logger } from '../../utils/logger';

export class MatchingEngine {
    /**
     * Find best matches for a waste listing
     */
    async findMatches(wasteListingId: string): Promise<Array<{
        needListing: any;
        score: number;
        factors: any;
        distance: number;
    }>> {
        const wasteListing = await WasteListing.findById(wasteListingId).populate('companyId');
        if (!wasteListing || wasteListing.status !== 'active') {
            throw new Error('Invalid or inactive listing');
        }

        // Query potential matching needs
        const potentialMatches = await NeedListing.find({
            status: 'active',
            'requirements.material.category': wasteListing.material.category,
            companyId: { $ne: wasteListing.companyId },
        }).populate('companyId');

        const scoredMatches = await Promise.all(
            potentialMatches.map(async (need) => {
                const score = await this.calculateMatchScore(wasteListing, need);
                return {
                    needListing: need,
                    ...score,
                };
            })
        );

        // Filter >70% matches, sort by score, top 10
        return scoredMatches
            .filter((m) => m.score >= 70)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }

    /**
     * Create match records from scored results
     */
    async createMatches(wasteListingId: string, results: Array<{
        needListing: any;
        score: number;
        factors: any;
        distance: number;
    }>): Promise<any[]> {
        const wasteListing = await WasteListing.findById(wasteListingId);
        if (!wasteListing) throw new Error('Listing not found');

        const matches = await Promise.all(
            results.map(async (result) => {
                // Calculate predicted impact
                const quantityKg = impactCalculator.normalizeToKg(
                    wasteListing.quantity.value,
                    wasteListing.quantity.unit
                );
                const impact = impactCalculator.calculateExchangeImpact(
                    wasteListing.material.category,
                    quantityKg,
                    result.distance
                );

                // Generate AI explanation
                let explanation = '';
                try {
                    explanation = await groqService.explainMatch(
                        wasteListing.toObject(),
                        result.needListing,
                        result.score,
                        result.distance
                    );
                } catch (err) {
                    logger.warn('AI match explanation failed, using default');
                    explanation = `Strong ${result.score}% match based on material compatibility and proximity (${result.distance}km).`;
                }

                const match = await Match.create({
                    wasteListingId: wasteListing._id,
                    needListingId: result.needListing._id,
                    sellerId: wasteListing.companyId,
                    buyerId: result.needListing.companyId._id || result.needListing.companyId,
                    matchScore: result.score,
                    matchFactors: result.factors,
                    aiAnalysis: {
                        explanation,
                        confidence: result.score,
                        riskFactors: [],
                        opportunities: [],
                    },
                    predictedImpact: {
                        co2SavedKg: impact.netCo2Saved,
                        waterSavedLiters: impact.waterSavedLiters,
                        landfillAvoidedM3: impact.landfillAvoidedM3,
                        energySavedKwh: impact.energySavedKwh,
                        economicValue: (wasteListing.pricing?.amount || 0) * wasteListing.quantity.value,
                        methodology: 'EPA WARM + IPCC India Grid Factors',
                    },
                    negotiation: { status: 'pending', messages: [] },
                    execution: { status: 'not_started' },
                    financials: { paymentStatus: 'pending' },
                    statusHistory: [{
                        status: 'pending',
                        changedAt: new Date(),
                        reason: 'Auto-generated match',
                    }],
                });

                return match;
            })
        );

        // Update listing match count
        await WasteListing.findByIdAndUpdate(wasteListingId, {
            $inc: { matchCount: matches.length },
        });

        return matches;
    }

    private async calculateMatchScore(waste: any, need: NeedListingDocument): Promise<{
        score: number;
        factors: any;
        distance: number;
    }> {
        const wasteCompany = waste.companyId;
        const needCompany = (need as any).companyId;

        // Distance calculation
        const wasteCoords = waste.location?.coordinates || wasteCompany?.location?.coordinates || [0, 0];
        const needCoords = needCompany?.location?.coordinates || [0, 0];
        const distance = calculateDistance(wasteCoords, needCoords);

        // Factor 1: Material Compatibility (40% weight)
        const materialScore = this.calculateMaterialCompatibility(waste.material, need.requirements.material);

        // Factor 2: Quantity Fit (20% weight)
        const quantityScore = this.calculateQuantityFit(waste.quantity, need.requirements.quantity);

        // Factor 3: Price Compatibility (20% weight)
        const priceScore = this.calculatePriceCompatibility(waste.pricing, need.requirements.budget);

        // Factor 4: Distance Score (10% weight)
        const distanceScore = this.calculateDistanceScore(distance, need.logistics.maxDistanceKm);

        // Factor 5: Reliability Score (10% weight)
        const reliabilityScore = await this.calculateReliabilityScore(
            wasteCompany?._id?.toString(),
            needCompany?._id?.toString()
        );

        const score = Math.round(
            materialScore * 0.4 +
            quantityScore * 0.2 +
            priceScore * 0.2 +
            distanceScore * 0.1 +
            reliabilityScore * 0.1
        );

        return {
            score: Math.min(100, Math.max(0, score)),
            factors: {
                materialCompatibility: materialScore,
                quantityFit: quantityScore,
                priceCompatibility: priceScore,
                distanceScore,
                reliabilityScore,
            },
            distance: Math.round(distance),
        };
    }

    private calculateMaterialCompatibility(wasteMat: any, needMat: any): number {
        let score = 0;

        if (wasteMat.category === needMat.category) score += 60;
        else return 0; // Different categories = 0

        if (needMat.subTypes?.includes(wasteMat.subType)) score += 30;
        else if (!needMat.subTypes || needMat.subTypes.length === 0) score += 20;

        const qualityMap: Record<string, number> = { industrial: 3, commercial: 2, mixed: 1, any: 0 };
        if ((qualityMap[wasteMat.grade] || 1) >= (qualityMap[needMat.quality] || 0)) score += 10;

        // Hazardous check
        if (wasteMat.hazardous && !needMat.hazardousAcceptable) return 0;

        // Excluded types
        if (needMat.excludedTypes?.includes(wasteMat.subType)) return 0;

        return Math.min(100, score);
    }

    private calculateQuantityFit(wasteQty: any, needQty: any): number {
        const wasteKg = impactCalculator.normalizeToKg(wasteQty.value, wasteQty.unit);
        const needMin = impactCalculator.normalizeToKg(needQty.min, needQty.unit);
        const needMax = impactCalculator.normalizeToKg(needQty.max, needQty.unit);

        if (wasteKg < needMin * 0.5) return 30; // Way too small
        if (wasteKg < needMin) return 50; // Partial fill
        if (wasteKg >= needMin && wasteKg <= needMax) return 100; // Perfect fit
        if (wasteKg <= needMax * 1.5) return 80; // Excess available
        return 60;
    }

    private calculatePriceCompatibility(wastePrice: any, needBudget: any): number {
        if (!wastePrice?.amount || wastePrice.type === 'free') return 100;

        const priceRatio = wastePrice.amount / needBudget.maxPricePerUnit;

        if (priceRatio <= 0.8) return 100;
        if (priceRatio <= 1.0) return 90;
        if (priceRatio <= 1.1) return 70;
        if (priceRatio <= 1.2) return 50;
        return 30;
    }

    private calculateDistanceScore(distance: number, maxDistance: number): number {
        if (maxDistance <= 0) return 50;
        if (distance <= maxDistance * 0.3) return 100;
        if (distance <= maxDistance * 0.5) return 90;
        if (distance <= maxDistance * 0.8) return 75;
        if (distance <= maxDistance) return 60;
        if (distance <= maxDistance * 1.2) return 40;
        return 20;
    }

    private async calculateReliabilityScore(sellerId?: string, buyerId?: string): Promise<number> {
        if (!sellerId || !buyerId) return 50;

        try {
            const sellerStats = await Match.aggregate([
                { $match: { sellerId, 'execution.status': 'completed' } },
                { $group: { _id: null, avgRating: { $avg: '$ratings.sellerRating' }, count: { $sum: 1 } } },
            ]);

            const buyerStats = await Match.aggregate([
                { $match: { buyerId, 'execution.status': 'completed' } },
                { $group: { _id: null, avgRating: { $avg: '$ratings.buyerRating' }, count: { $sum: 1 } } },
            ]);

            const sellerScore = sellerStats[0] ? sellerStats[0].avgRating * 20 : 50;
            const buyerScore = buyerStats[0] ? buyerStats[0].avgRating * 20 : 50;

            return Math.round((sellerScore + buyerScore) / 2);
        } catch {
            return 50;
        }
    }
}

export const matchingEngine = new MatchingEngine();
