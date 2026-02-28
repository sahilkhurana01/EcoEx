import { Request, Response, NextFunction } from 'express';
import { Match } from '../models/Match';
import { WasteListing } from '../models/WasteListing';
import { ProductPassport } from '../models/ProductPassport';
import { matchingEngine } from '../services/matching/algorithm';
import { impactCalculator } from '../services/impact/calculator';
import { brevoService } from '../services/notifications/brevo.service';
import { n8nService } from '../services/notifications/n8n.service';
import { Company } from '../models/Company';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class MatchingController {
    /**
     * POST /api/matches/find
     * Trigger match finding for a waste listing
     */
    async findMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { wasteListingId } = req.body;

            if (!wasteListingId) {
                res.status(400).json({ success: false, error: 'wasteListingId is required' });
                return;
            }

            // Verify ownership
            const listing = await WasteListing.findById(wasteListingId);
            if (!listing) {
                res.status(404).json({ success: false, error: 'Listing not found' });
                return;
            }

            if (listing.companyId.toString() !== req.user?.companyId && listing.companyId.toString() !== req.user?.userId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            // Run matching engine
            const results = await matchingEngine.findMatches(wasteListingId);

            if (results.length === 0) {
                res.json({
                    success: true,
                    data: [],
                    message: 'No matches found above 70% threshold. Try adjusting listing parameters.',
                });
                return;
            }

            // Create match records
            const matches = await matchingEngine.createMatches(wasteListingId, results);

            // Notify top 3 matches via email (async, don't wait)
            for (const match of matches.slice(0, 3)) {
                const buyerCompany = await Company.findById(match.buyerId);
                if (buyerCompany?.email) {
                    brevoService.sendMatchNotification(buyerCompany.email, {
                        matchId: match._id,
                        material: listing.material.category,
                        quantity: `${listing.quantity.value} ${listing.quantity.unit}`,
                        price: listing.pricing?.amount,
                        sellerName: 'Industrial Supplier',
                        distance: results.find((r: any) => r.needListing._id.toString() === match.needListingId.toString())?.distance || 0,
                        score: match.matchScore,
                        impact: match.predictedImpact,
                    }).catch((err: any) => logger.warn('Match notification email failed:', err));
                }
                n8nService.triggerMatchFound(match).catch(() => { });
            }

            res.json({
                success: true,
                data: matches,
                message: `Found ${matches.length} matches`,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/matches
     * Get matches for current user (as buyer or seller)
     */
    async getMyMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            const { status, role, page = '1', limit = '20' } = req.query;

            const filter: any = {};
            if (role === 'seller') {
                filter.sellerId = companyId;
            } else if (role === 'buyer') {
                filter.buyerId = companyId;
            } else {
                filter.$or = [{ sellerId: companyId }, { buyerId: companyId }];
            }

            if (status) filter['negotiation.status'] = status;

            const pageNum = parseInt(page as string);
            const limitNum = Math.min(parseInt(limit as string), 50);

            const [matches, total] = await Promise.all([
                Match.find(filter)
                    .populate('wasteListingId', 'material quantity pricing status')
                    .populate('needListingId', 'requirements urgency')
                    .populate('sellerId', 'name industry location.city')
                    .populate('buyerId', 'name industry location.city')
                    .sort({ matchScore: -1, createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum),
                Match.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: matches,
                pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/matches/:id
     */
    async getMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const match = await Match.findById(req.params.id)
                .populate('wasteListingId')
                .populate('needListingId')
                .populate('sellerId', 'name industry location email')
                .populate('buyerId', 'name industry location email')
                .populate('passportId');

            if (!match) {
                res.status(404).json({ success: false, error: 'Match not found' });
                return;
            }

            res.json({ success: true, data: match });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/matches/:id/accept
     */
    async acceptMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const match = await Match.findById(req.params.id);
            if (!match) {
                res.status(404).json({ success: false, error: 'Match not found' });
                return;
            }

            const companyId = req.user?.companyId || req.user?.userId;
            if (match.buyerId.toString() !== companyId && match.sellerId.toString() !== companyId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            match.negotiation.status = 'accepted';
            match.negotiation.acceptedAt = new Date();
            match.negotiation.acceptedBy = companyId;
            match.execution.status = 'pickup_scheduled';
            match.statusHistory.push({
                status: 'accepted',
                changedAt: new Date(),
                changedBy: companyId,
                reason: req.body.reason || 'Match accepted',
            });

            await match.save();

            // Update listing status
            await WasteListing.findByIdAndUpdate(match.wasteListingId, { status: 'reserved' });

            res.json({ success: true, data: match });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/matches/:id/negotiate
     */
    async negotiate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const match = await Match.findById(req.params.id);
            if (!match) {
                res.status(404).json({ success: false, error: 'Match not found' });
                return;
            }

            const companyId = req.user?.companyId || req.user?.userId;
            if (match.buyerId.toString() !== companyId && match.sellerId.toString() !== companyId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            match.negotiation.status = 'in_progress';
            if (req.body.proposedPrice) match.negotiation.proposedPrice = req.body.proposedPrice;
            if (req.body.proposedQuantity) match.negotiation.proposedQuantity = req.body.proposedQuantity;
            if (req.body.proposedPickupDate) match.negotiation.proposedPickupDate = new Date(req.body.proposedPickupDate);

            match.negotiation.messages.push({
                from: companyId as any,
                message: req.body.message || 'Counter offer submitted',
                timestamp: new Date(),
                attachments: req.body.attachments || [],
            });

            match.statusHistory.push({
                status: 'negotiating',
                changedAt: new Date(),
                changedBy: companyId,
                reason: 'Counter offer',
            });

            await match.save();

            res.json({ success: true, data: match });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/matches/:id/complete
     * Mark a match as completed and generate product passport
     */
    async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const match = await Match.findById(req.params.id)
                .populate('wasteListingId')
                .populate('sellerId', 'name location')
                .populate('buyerId', 'name location');

            if (!match) {
                res.status(404).json({ success: false, error: 'Match not found' });
                return;
            }

            const companyId = req.user?.companyId || req.user?.userId;

            // Calculate actual impact
            const wasteListing = match.wasteListingId as any;
            const quantityKg = impactCalculator.normalizeToKg(
                wasteListing.quantity.value,
                wasteListing.quantity.unit
            );
            const seller = match.sellerId as any;
            const buyer = match.buyerId as any;

            const distance = req.body.actualDistanceKm || match.matchFactors?.distanceScore || 50;
            const impact = impactCalculator.calculateExchangeImpact(
                wasteListing.material.category,
                quantityKg,
                distance,
                req.body.transportMode || 'truck'
            );

            match.actualImpact = {
                co2SavedKg: impact.co2SavedKg,
                waterSavedLiters: impact.waterSavedLiters,
                landfillAvoidedM3: impact.landfillAvoidedM3,
                energySavedKwh: impact.energySavedKwh,
                transportEmissionsKg: impact.transportEmissionsKg,
                netCo2Saved: impact.netCo2Saved,
                economicValueRealized: req.body.finalPrice || (wasteListing.pricing?.amount || 0) * wasteListing.quantity.value,
            };

            match.execution.status = 'completed';
            match.execution.verifiedAt = new Date();
            match.completedAt = new Date();
            match.statusHistory.push({
                status: 'completed',
                changedAt: new Date(),
                changedBy: companyId,
                reason: 'Transaction completed',
            });

            // Generate Product Passport
            const passportNumber = `CIRC-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
            const passport = await ProductPassport.create({
                passportNumber,
                origin: {
                    companyId: match.sellerId,
                    companyName: seller?.name || 'Seller',
                    location: { coordinates: seller?.location?.coordinates || [0, 0], address: seller?.location?.address || '' },
                    materialType: wasteListing.material.category,
                    quantity: wasteListing.quantity.value,
                    unit: wasteListing.quantity.unit,
                    date: match.createdAt,
                },
                journey: {
                    transport: {
                        mode: req.body.transportMode || 'truck',
                        distanceKm: distance,
                        emissionsKg: impact.transportEmissionsKg,
                    },
                },
                destination: {
                    companyId: match.buyerId,
                    companyName: buyer?.name || 'Buyer',
                    location: { coordinates: buyer?.location?.coordinates || [0, 0], address: buyer?.location?.address || '' },
                    date: new Date(),
                },
                impact: {
                    co2SavedVsVirgin: impact.co2SavedKg,
                    waterSavedLiters: impact.waterSavedLiters,
                    energySavedKwh: impact.energySavedKwh,
                    landfillAvoidedM3: impact.landfillAvoidedM3,
                    methodology: 'EPA WARM Model + IPCC India Grid Factors',
                },
                blockchain: { network: 'none' },
                verification: { status: 'verified' },
                publicUrl: `/verify/${passportNumber}`,
                matchId: match._id,
            });

            match.passportId = passport._id;
            await match.save();

            // Update listing status
            await WasteListing.findByIdAndUpdate(match.wasteListingId, { status: 'completed' });

            // Trigger n8n and email (async)
            n8nService.triggerDealCompleted(match).catch(() => { });

            res.json({
                success: true,
                data: {
                    match,
                    passport,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const matchingController = new MatchingController();
