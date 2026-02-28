import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter — 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased to support dashboard polling
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests. Please try again in 15 minutes.',
    },
});

/**
 * Strict rate limiter for auth endpoints — 10 per 15 minutes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
    },
});

/**
 * AI endpoint rate limiter — 30 per 15 minutes
 */
export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'AI request limit reached. Please try again later.',
    },
});
