import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Company } from '../models/Company';
import { logger } from '../utils/logger';

export class AuthController {
    /**
     * POST /api/auth/clerk-webhook
     * Handle Clerk webhook events (user.created, user.updated, etc.)
     */
    async clerkWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { type, data } = req.body;

            logger.info(`Clerk webhook received: ${type}`);

            switch (type) {
                case 'user.created': {
                    const existingCompany = await Company.findOne({ clerkUserId: data.id });
                    if (!existingCompany) {
                        await Company.create({
                            clerkUserId: data.id,
                            name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'New Company',
                            email: data.email_addresses?.[0]?.email_address,
                            industry: 'other',
                            location: { type: 'Point', coordinates: [0, 0] },
                            onboardingComplete: false,
                            verificationStatus: 'pending',
                        });
                        logger.info(`Company created for Clerk user: ${data.id}`);
                    }
                    break;
                }
                case 'user.updated': {
                    await Company.findOneAndUpdate(
                        { clerkUserId: data.id },
                        {
                            email: data.email_addresses?.[0]?.email_address,
                            lastLoginAt: new Date(),
                        }
                    );
                    break;
                }
                case 'user.deleted': {
                    await Company.findOneAndUpdate(
                        { clerkUserId: data.id },
                        { verificationStatus: 'suspended' }
                    );
                    break;
                }
            }

            res.status(200).json({ success: true, message: 'Webhook processed' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/sync
     * Sync authenticated Clerk user to Company document
     */
    async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.user.userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const clerkId = req.user.userId;
            const email = req.user.email;

            let company = await Company.findOne({ clerkUserId: clerkId });

            if (!company) {
                // Wait to see if webhook created it
                await new Promise((resolve) => setTimeout(resolve, 500));
                company = await Company.findOne({ clerkUserId: clerkId });

                if (!company) {
                    // Create it proactively if webhook is delayed
                    company = await Company.create({
                        clerkUserId: clerkId,
                        name: 'New Company',
                        email: email || '',
                        industry: 'other',
                        location: { type: 'Point', coordinates: [0, 0] },
                        onboardingComplete: false,
                        verificationStatus: 'pending',
                    });
                    logger.info(`Company created from sync for Clerk user: ${clerkId}`);
                }
            } else {
                company.lastLoginAt = new Date();
                // Proactively sync email if missing
                if (!company.email && email) {
                    company.email = email;
                    logger.info(`Synced missing email for company: ${company.name}`);
                }
                await company.save();
            }

            res.json({
                success: true,
                data: {
                    company: {
                        id: company._id,
                        name: company.name,
                        tradingName: company.tradingName,
                        email: company.email,
                        industry: company.industry,
                        onboardingComplete: company.onboardingComplete,
                        verificationStatus: company.verificationStatus,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/register
     * Register a new company with JWT (non-Clerk path)
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, email, password, industry, location } = req.body;

            const existing = await Company.findOne({ email });
            if (existing) {
                res.status(409).json({ success: false, error: 'Email already registered' });
                return;
            }

            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 12);

            const company = await Company.create({
                name,
                email,
                industry: industry || 'other',
                location: location || { type: 'Point', coordinates: [0, 0] },
                onboardingComplete: false,
                verificationStatus: 'pending',
            });

            const token = jwt.sign(
                { userId: company._id.toString(), companyId: company._id.toString(), email },
                env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.status(201).json({
                success: true,
                data: {
                    token,
                    company: {
                        id: company._id,
                        name: company.name,
                        tradingName: company.tradingName,
                        email: company.email,
                        industry: company.industry,
                        onboardingComplete: company.onboardingComplete,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/login
     * Login with email + password (non-Clerk path)
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;

            const company = await Company.findOne({ email });
            if (!company) {
                res.status(401).json({ success: false, error: 'Invalid credentials' });
                return;
            }

            // For JWT-based auth, generate token
            const token = jwt.sign(
                { userId: company._id.toString(), companyId: company._id.toString(), email },
                env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            company.lastLoginAt = new Date();
            await company.save();

            res.json({
                success: true,
                data: {
                    token,
                    company: {
                        id: company._id,
                        name: company.name,
                        tradingName: company.tradingName,
                        email: company.email,
                        industry: company.industry,
                        onboardingComplete: company.onboardingComplete,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     * Get current authenticated user
     */
    async me(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const company = await Company.findById(req.user?.companyId || req.user?.userId);
            if (!company) {
                res.status(404).json({ success: false, error: 'Company not found' });
                return;
            }

            res.json({
                success: true,
                data: company,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
