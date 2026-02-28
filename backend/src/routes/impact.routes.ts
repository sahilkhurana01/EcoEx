import { Router } from 'express';
import { impactController } from '../controllers/impact.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validation.middleware';
import { calculateImpactSchema, chatSchema, esgReportSchema } from '../validators';

const router = Router();

// Impact
router.post('/calculate', authMiddleware, validate(calculateImpactSchema), impactController.calculate.bind(impactController));
router.get('/history', authMiddleware, impactController.history.bind(impactController));
router.get('/leaderboard', impactController.leaderboard.bind(impactController));

// AI-powered (rate limited)
router.post('/predictions', authMiddleware, aiLimiter, impactController.predictions.bind(impactController));
router.post('/recommendations', authMiddleware, aiLimiter, impactController.recommendations.bind(impactController));
router.post('/chat', authMiddleware, aiLimiter, validate(chatSchema), impactController.chat.bind(impactController));

// ESG
router.post('/esg/generate-report', authMiddleware, aiLimiter, validate(esgReportSchema), impactController.generateESGReport.bind(impactController));
router.get('/compliance-status', authMiddleware, impactController.complianceStatus.bind(impactController));
router.get('/esg/reports', authMiddleware, impactController.getESGReports.bind(impactController));

export default router;
