import { Router } from 'express';
import authRoutes from './auth.routes';
import companiesRoutes from './companies.routes';
import marketplaceRoutes from './marketplace.routes';
import matchesRoutes from './matches.routes';
import impactRoutes from './impact.routes';
import passportRoutes from './passport.routes';
import predictionRoutes from './predictions.routes';
import suggestionRoutes from './suggestions.routes';
import mlRoutes from './ml.routes';
import alertsRoutes from './alerts.routes';
import webhookRoutes from './webhook.routes';
import roiRoutes from './roi.routes';
import esgLiveRoutes from './esgLive.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/matches', matchesRoutes);
router.use('/impact', impactRoutes);
router.use('/passports', passportRoutes);
router.use('/predictions', predictionRoutes);
router.use('/suggestions', suggestionRoutes);
router.use('/ml', mlRoutes);
router.use('/alerts', alertsRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/roi', roiRoutes);
router.use('/esg-live', esgLiveRoutes);

export default router;
