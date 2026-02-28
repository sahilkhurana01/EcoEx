import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns a structured response
 */
export const errorHandler = (
    err: Error & { statusCode?: number; code?: number | string },
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Log the full error
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
        stack: err.stack,
        body: req.body,
        params: req.params,
        query: req.query,
        user: req.user?.userId,
    });

    // Mongoose duplicate key error
    if (err.code === 11000) {
        res.status(409).json({
            success: false,
            error: 'Duplicate entry. This resource already exists.',
        });
        return;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            error: 'Validation failed.',
            details: err.message,
        });
        return;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        res.status(400).json({
            success: false,
            error: 'Invalid resource ID format.',
        });
        return;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token.',
        });
        return;
    }

    // Ensure CORS headers are present even on error responses
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500
            ? 'Internal server error. Please try again later.'
            : err.message,
    });
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found.`,
    });
};
