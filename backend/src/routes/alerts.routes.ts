import { Router } from 'express';
import { alertsController } from '../controllers/alerts.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public (no auth needed for scenario list)
router.get('/scenarios', alertsController.getScenarios.bind(alertsController));

// Authenticated routes
router.post('/simulate', authMiddleware, alertsController.simulate.bind(alertsController));
router.get('/history', authMiddleware, alertsController.getHistory.bind(alertsController));
router.get('/recent', authMiddleware, alertsController.getRecent.bind(alertsController));
router.put('/:id/acknowledge', authMiddleware, alertsController.acknowledge.bind(alertsController));
router.put('/acknowledge-all', authMiddleware, alertsController.acknowledgeAll.bind(alertsController));
router.get('/settings', authMiddleware, alertsController.getSettings.bind(alertsController));
router.put('/settings', authMiddleware, alertsController.updateSettings.bind(alertsController));

export default router;
