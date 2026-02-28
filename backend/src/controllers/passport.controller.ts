import { Request, Response, NextFunction } from 'express';
import { ProductPassport } from '../models/ProductPassport';
import { logger } from '../utils/logger';

export class PassportController {
    /**
     * GET /api/product-passports/:id
     * Get passport by MongoDB ID
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const passport = await ProductPassport.findById(req.params.id)
                .populate('matchId', 'matchScore negotiation.status');

            if (!passport) {
                res.status(404).json({ success: false, error: 'Product passport not found' });
                return;
            }

            res.json({ success: true, data: passport });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/verify/:passportNumber
     * Public verification endpoint (no auth required)
     */
    async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const passport = await ProductPassport.findOne({
                passportNumber: req.params.passportNumber,
            });

            if (!passport) {
                res.status(404).json({
                    success: false,
                    error: 'Invalid passport number. This certificate does not exist.',
                });
                return;
            }

            // Public-safe data only (no internal IDs)
            res.json({
                success: true,
                data: {
                    passportNumber: passport.passportNumber,
                    status: passport.verification.status,
                    origin: {
                        company: passport.origin.companyName,
                        material: passport.origin.materialType,
                        quantity: `${passport.origin.quantity} ${passport.origin.unit}`,
                        date: passport.origin.date,
                    },
                    destination: {
                        company: passport.destination.companyName,
                        application: passport.destination.application,
                        date: passport.destination.date,
                    },
                    journey: {
                        transportMode: passport.journey.transport.mode,
                        distanceKm: passport.journey.transport.distanceKm,
                    },
                    impact: {
                        co2SavedKg: passport.impact.co2SavedVsVirgin,
                        waterSavedLiters: passport.impact.waterSavedLiters,
                        energySavedKwh: passport.impact.energySavedKwh,
                        landfillAvoidedM3: passport.impact.landfillAvoidedM3,
                        methodology: passport.impact.methodology,
                    },
                    blockchain: passport.blockchain,
                    verifiedAt: passport.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/product-passports
     * List passports for a company
     */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId || req.user?.userId;
            const { page = '1', limit = '20' } = req.query;

            const pageNum = parseInt(page as string);
            const limitNum = Math.min(parseInt(limit as string), 50);

            const filter = {
                $or: [
                    { 'origin.companyId': companyId },
                    { 'destination.companyId': companyId },
                ],
            };

            const [passports, total] = await Promise.all([
                ProductPassport.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum),
                ProductPassport.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: passports,
                pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
            });
        } catch (error) {
            next(error);
        }
    }
}

export const passportController = new PassportController();
