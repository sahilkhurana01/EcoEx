import { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company';
import { ImpactAnalytics } from '../models/ImpactAnalytics';
import { WasteListing } from '../models/WasteListing';
import { Match } from '../models/Match';
import { logger } from '../utils/logger';
import { triggerESGLiveUpdate } from './esgLiveDocument.controller';

export class CompanyController {
    /**
     * POST /api/companies
     * Create a new company profile
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyData = {
                ...req.body,
                clerkUserId: req.user?.userId,
            };

            const company = await Company.create(companyData);

            res.status(201).json({
                success: true,
                data: company,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/companies/:id
     * Get company profile
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            res.json({ success: true, data: company });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/companies/:id
     * Update company profile
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            // Authorization check
            if (company._id.toString() !== req.user?.companyId && company.clerkUserId !== req.user?.userId) {
                res.status(403).json({ success: false, error: 'Not authorized to update this company' });
                return;
            }

            const updated = await Company.findByIdAndUpdate(
                req.params.id,
                { ...req.body, updatedAt: new Date() },
                { new: true, runValidators: true }
            );

            // Trigger AI-powered ESG push for active viewers
            if (updated) {
                triggerESGLiveUpdate(updated._id.toString());
            }

            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/companies/:id/analytics
     * Get company analytics summary
     */
    async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.params.id;
            const period = (req.query.period as string) || 'monthly';

            const { impactService } = require('../services/impact.service');
            const result = await impactService.getCompanyAnalytics(companyId, period);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/companies
     * List companies with optional filters
     */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                industry,
                city,
                state,
                verified,
                page = '1',
                limit = '20',
            } = req.query;

            const filter: any = {};
            if (industry) filter.industry = industry;
            if (city) filter['location.city'] = city;
            if (state) filter['location.state'] = state;
            if (verified === 'true') filter.verificationStatus = 'verified';

            const pageNum = parseInt(page as string);
            const limitNum = Math.min(parseInt(limit as string), 50);
            const skip = (pageNum - 1) * limitNum;

            const [companies, total] = await Promise.all([
                Company.find(filter)
                    .select('-baselineMetrics -energyContext -operatingHours')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Company.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: companies,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/companies/nearby
     * Find companies near a location
     */
    async nearby(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { lng, lat, radiusKm = '100', industry } = req.query;

            if (!lng || !lat) {
                res.status(400).json({ success: false, error: 'lng and lat are required' });
                return;
            }

            const filter: any = {
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
                        },
                        $maxDistance: parseInt(radiusKm as string) * 1000, // Convert km to meters
                    },
                },
            };
            if (industry) filter.industry = industry;

            const companies = await Company.find(filter)
                .select('name industry location verificationStatus')
                .limit(50);

            res.json({ success: true, data: companies });
        } catch (error) {
            next(error);
        }
    }
}

export const companyController = new CompanyController();
