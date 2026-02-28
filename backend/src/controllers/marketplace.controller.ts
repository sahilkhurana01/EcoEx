import { Request, Response, NextFunction } from 'express';
import { WasteListing } from '../models/WasteListing';
import { NeedListing } from '../models/NeedListing';
import { Company } from '../models/Company';
import { Match } from '../models/Match';
import { logger } from '../utils/logger';
import { brevoService } from '../services/notifications/brevo.service';
import { env } from '../config/env';

export class MarketplaceController {
    // ==================== WASTE LISTINGS ====================

    /**
     * POST /api/waste-listings
     */
    async createWasteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.body.companyId || req.user?.companyId || req.user?.userId;
            const company = await Company.findById(companyId);

            const listing = await WasteListing.create({
                ...req.body,
                companyId,
                location: req.body.location || company?.location || { type: 'Point', coordinates: [0, 0] },
            });

            res.status(201).json({ success: true, data: listing });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/waste-listings
     * Search with filters: category, status, city, radius, price range, pagination
     */
    async searchWasteListings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                category,
                status = 'active',
                city,
                lng,
                lat,
                radiusKm,
                minPrice,
                maxPrice,
                hazardous,
                companyId,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                page = '1',
                limit = '20',
            } = req.query;

            const filter: any = {};
            if (status && status !== 'all') filter.status = status;
            if (category) filter['material.category'] = category;
            if (city) filter['location.city'] = city;
            if (hazardous !== undefined) filter['material.hazardous'] = hazardous === 'true';
            if (companyId) filter.companyId = companyId;


            // Geospatial filter
            if (lng && lat && radiusKm) {
                filter.location = {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
                        },
                        $maxDistance: parseInt(radiusKm as string) * 1000,
                    },
                };
            }

            // Price range filter
            if (minPrice || maxPrice) {
                filter['pricing.amount'] = {};
                if (minPrice) filter['pricing.amount'].$gte = parseFloat(minPrice as string);
                if (maxPrice) filter['pricing.amount'].$lte = parseFloat(maxPrice as string);
            }

            const pageNum = parseInt(page as string);
            const limitNum = Math.min(parseInt(limit as string), 50);
            const skip = (pageNum - 1) * limitNum;

            const sortObj: any = {};
            sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

            const [listings, total] = await Promise.all([
                WasteListing.find(filter)
                    .populate('companyId', 'name industry location.city verificationStatus')
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limitNum),
                WasteListing.countDocuments(filter),
            ]);


            res.json({
                success: true,
                data: listings,
                pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/waste-listings/:id
     */
    async getWasteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listing = await WasteListing.findById(req.params.id)
                .populate('companyId', 'name industry location verificationStatus');

            if (!listing) {
                res.status(404).json({ success: false, error: 'Listing not found' });
                return;
            }

            // Increment view count
            await WasteListing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

            res.json({ success: true, data: listing });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/waste-listings/:id
     */
    async updateWasteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listing = await WasteListing.findById(req.params.id);
            if (!listing) {
                res.status(404).json({ success: false, error: 'Listing not found' });
                return;
            }

            if (listing.companyId.toString() !== req.user?.companyId && listing.companyId.toString() !== req.user?.userId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            const updated = await WasteListing.findByIdAndUpdate(
                req.params.id,
                { ...req.body, updatedAt: new Date() },
                { new: true, runValidators: true }
            );

            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/waste-listings/:id
     */
    async deleteWasteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listing = await WasteListing.findById(req.params.id);
            if (!listing) {
                res.status(404).json({ success: false, error: 'Listing not found' });
                return;
            }

            if (listing.companyId.toString() !== req.user?.companyId && listing.companyId.toString() !== req.user?.userId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            listing.status = 'withdrawn';
            await listing.save();

            res.json({ success: true, message: 'Listing withdrawn' });
        } catch (error) {
            next(error);
        }
    }

    // ==================== NEED LISTINGS ====================

    /**
     * POST /api/need-listings
     */
    async createNeedListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;

            const listing = await NeedListing.create({
                ...req.body,
                companyId,
            });

            res.status(201).json({ success: true, data: listing });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/need-listings
     */
    async searchNeedListings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                category,
                status = 'active',
                urgency,
                page = '1',
                limit = '20',
            } = req.query;

            const filter: any = {};
            if (status) filter.status = status;
            if (category) filter['requirements.material.category'] = category;
            if (urgency) filter.urgency = urgency;

            const pageNum = parseInt(page as string);
            const limitNum = Math.min(parseInt(limit as string), 50);
            const skip = (pageNum - 1) * limitNum;

            const [listings, total] = await Promise.all([
                NeedListing.find(filter)
                    .populate('companyId', 'name industry location.city')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                NeedListing.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: listings,
                pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/need-listings/:id
     */
    async getNeedListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listing = await NeedListing.findById(req.params.id)
                .populate('companyId', 'name industry location');

            if (!listing) {
                res.status(404).json({ success: false, error: 'Need listing not found' });
                return;
            }

            res.json({ success: true, data: listing });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/need-listings/:id
     */
    async updateNeedListing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listing = await NeedListing.findById(req.params.id);
            if (!listing) {
                res.status(404).json({ success: false, error: 'Need listing not found' });
                return;
            }

            if (listing.companyId.toString() !== req.user?.companyId && listing.companyId.toString() !== req.user?.userId) {
                res.status(403).json({ success: false, error: 'Not authorized' });
                return;
            }

            const updated = await NeedListing.findByIdAndUpdate(
                req.params.id,
                { ...req.body },
                { new: true, runValidators: true }
            );

            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/marketplace/stats
     * Public marketplace statistics
     */
    async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const [activeWaste, activeNeeds, totalCompanies, recentMatches] = await Promise.all([
                WasteListing.countDocuments({ status: 'active' }),
                NeedListing.countDocuments({ status: 'active' }),
                Company.countDocuments({ verificationStatus: { $ne: 'suspended' } }),
                Match.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            ]);

            // category breakdown
            const categoryBreakdown = await WasteListing.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$material.category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity.value' } } },
                { $sort: { count: -1 } },
            ]);

            res.json({
                success: true,
                data: {
                    activeWasteListings: activeWaste,
                    activeNeedListings: activeNeeds,
                    totalCompanies,
                    matchesThisMonth: recentMatches,
                    categoryBreakdown,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/marketplace/waste-listings/:id/contact
     * Send interest email to the listing owner via Brevo
     */
    async contactSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const listingId = req.params.id;
            const buyerCompanyId = req.body.buyerCompanyId || req.user?.companyId || req.user?.userId;

            // Fetch the listing WITH the seller company populated
            const listing = await WasteListing.findById(listingId)
                .populate('companyId', 'name email industry location');

            if (!listing) {
                res.status(404).json({ success: false, error: 'Listing not found' });
                return;
            }

            const sellerCompany = listing.companyId as any;
            // Use seller email, or fall back to platform admin email so the inquiry is never lost
            const sellerEmail: string = sellerCompany?.email
                || env.BREVO_SENDER_EMAIL
                || '90a43a001@smtp-brevo.com';

            if (!sellerCompany?.email) {
                logger.warn(`Seller for listing ${listingId} has no email — forwarding to platform admin (${sellerEmail})`);
            }

            // Fetch buyer company info
            const buyerCompany = await Company.findById(buyerCompanyId);
            const buyerName = buyerCompany?.name || 'A verified company';
            const buyerIndustry = (buyerCompany as any)?.industry || 'Industrial';
            const buyerEmail = (buyerCompany as any)?.email || req.user?.email || '';
            const buyerMessage = req.body.message || '';

            const materialName = listing.material?.category?.replace(/_/g, ' ') || 'waste material';
            const quantity = `${listing.quantity?.value || 0} ${listing.quantity?.unit || 'kg'}`;
            const price = listing.pricing?.amount ? `₹${listing.pricing.amount.toLocaleString()}` : 'Negotiable';

            // Always record the inquiry regardless of email outcome
            await WasteListing.findByIdAndUpdate(listingId, { $inc: { inquiryCount: 1 } });

            // Attempt email delivery (non-blocking for the user experience)
            let emailSent = false;
            try {
                await brevoService.sendContactSellerEmail(sellerEmail, {
                    sellerName: sellerCompany?.name || 'Seller',
                    buyerName,
                    buyerIndustry,
                    buyerEmail,
                    buyerMessage,
                    materialName,
                    quantity,
                    price,
                    listingId,
                });
                emailSent = true;
            } catch (emailError: any) {
                logger.error(`Failed to deliver contact-seller email for listing ${listingId}:`, {
                    message: emailError.message,
                    code: emailError.code,
                });
            }

            if (emailSent) {
                logger.info(`Contact seller email sent for listing ${listingId} from ${buyerName}`);
                res.json({
                    success: true,
                    message: 'Interest notification sent to seller. They will contact you shortly.',
                });
            } else {
                // Partial success — interest recorded but email failed
                logger.info(`Interest recorded for listing ${listingId} from ${buyerName} (email delivery failed)`);
                res.status(202).json({
                    success: true,
                    message: 'Your interest has been recorded. The seller will be notified when the email service recovers.',
                    emailDelivered: false,
                });
            }
        } catch (error) {
            next(error);
        }
    }
}

export const marketplaceController = new MarketplaceController();
