import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware
 * Validates request body, query, or params against a Zod schema
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data; // Replace with validated/transformed data
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));

                // Log validation error for debugging
                import('../utils/logger').then(({ logger }) => {
                    logger.error(`Validation failed for ${req.method} ${req.originalUrl}`, {
                        errors: formattedErrors,
                        body: req.body,
                        params: req.params,
                        query: req.query
                    });
                });

                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: formattedErrors,
                });
                return;
            }
            next(error);
        }
    };
};
