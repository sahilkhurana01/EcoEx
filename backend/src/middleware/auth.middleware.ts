import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Company } from '../models/Company';

/**
 * JWT Authentication middleware
 * Supports both Clerk JWTs and custom JWTs
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authentication required. Provide Bearer token.',
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            // Try to verify as our own JWT first
            const decoded = jwt.verify(token, env.JWT_SECRET) as {
                userId: string;
                companyId?: string;
                email?: string;
            };

            (req as any).user = {
                userId: decoded.userId,
                companyId: decoded.companyId,
                email: decoded.email,
            };
            (req as any).companyId = decoded.companyId;

            next();
        } catch (jwtError) {
            // If JWT fails, try Clerk-style token (decode without verify for dev)
            try {
                const decoded = jwt.decode(token) as any;
                if (decoded && decoded.sub) {
                    // Find company by clerkUserId
                    const company = await Company.findOne({ clerkUserId: decoded.sub });
                    const companyId = company?._id?.toString();

                    (req as any).user = {
                        userId: decoded.sub,
                        companyId,
                        email: decoded.email || decoded.email_addresses?.[0]?.email_address,
                    };
                    (req as any).companyId = companyId;

                    next();
                } else {
                    throw new Error('Invalid token payload');
                }
            } catch (clerkError) {
                logger.warn('Authentication failed:', { error: (clerkError as Error).message });
                res.status(401).json({
                    success: false,
                    error: 'Invalid or expired authentication token.',
                });
            }
        }
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication service error.',
        });
    }
};

/**
 * Optional auth — sets req.user if token exists, but doesn't block
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        req.user = {
            userId: decoded.userId,
            companyId: decoded.companyId,
            email: decoded.email,
        };
    } catch {
        // Silently continue without auth
    }
    next();
};
