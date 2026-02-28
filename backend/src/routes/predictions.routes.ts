import { Router } from 'express';
import { predictionController } from '../controllers/prediction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Secure all routes
router.use(authMiddleware);

// Generate predictions for a company
router.post('/:companyId/generate', (req, res, next) => predictionController.generate(req, res, next));

// Get latest prediction
router.get('/:companyId', (req, res, next) => predictionController.getLatest(req, res, next));

// Get prediction history
router.get('/:companyId/history', (req, res, next) => predictionController.getHistory(req, res, next));

// What-if scenario analysis
router.post('/:companyId/scenario', (req, res, next) => predictionController.scenario(req, res, next));

export default router;
