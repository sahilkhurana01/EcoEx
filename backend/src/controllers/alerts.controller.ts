import { Request, Response } from 'express';
import { alertOrchestratorService } from '../services/alerts/alertOrchestrator.service';
import { SIMULATION_SCENARIOS } from '../services/alerts/aiEmailGenerator.service';
import { logger } from '../utils/logger';

export class AlertsController {

    /**
     * POST /api/alerts/simulate
     * Trigger a simulation alert from the floating action button
     */
    async simulate(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const { alertType, severity = 'high', customMessage } = req.body;

            if (!alertType) {
                res.status(400).json({ success: false, error: 'alertType is required' });
                return;
            }

            if (!SIMULATION_SCENARIOS[alertType]) {
                res.status(400).json({
                    success: false,
                    error: `Invalid alertType. Valid types: ${Object.keys(SIMULATION_SCENARIOS).join(', ')}`,
                });
                return;
            }

            // Rate limit check
            const rateCheck = await alertOrchestratorService.canSimulate(companyId);
            if (!rateCheck.allowed) {
                res.status(429).json({
                    success: false,
                    error: 'Simulation rate limit reached (5 per hour). Please try again later.',
                    remaining: rateCheck.remaining,
                });
                return;
            }

            const startTime = Date.now();
            const result = await alertOrchestratorService.runSimulation({
                companyId,
                alertType,
                severity,
                customMessage,
                userEmail: (req as any).user?.email
            });
            const totalTimeMs = Date.now() - startTime;

            res.json({
                success: true,
                data: {
                    ...result,
                    totalTimeMs,
                    simulationsRemaining: rateCheck.remaining - 1,
                },
            });
        } catch (error: any) {
            logger.error('Simulation failed:', {
                message: error.message,
                stack: error.stack,
                companyId: (req as any).companyId
            });
            res.status(500).json({
                success: false,
                error: error.message || 'Simulation failed',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    /**
     * GET /api/alerts/scenarios
     * Return available simulation scenarios for the modal
     */
    async getScenarios(_req: Request, res: Response): Promise<void> {
        const scenarios = Object.entries(SIMULATION_SCENARIOS).map(([key, val]) => ({
            id: key,
            category: val.category,
            title: val.title,
            description: val.description,
            metric: val.metric,
            unit: val.unit,
        }));

        res.json({ success: true, data: scenarios });
    }

    /**
     * GET /api/alerts/history
     * Fetch paginated alert history
     */
    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const {
                page = '1',
                limit = '20',
                category,
                severity,
                status,
            } = req.query;

            const result = await alertOrchestratorService.getAlertHistory(companyId, {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                category: category as string | undefined,
                severity: severity as string | undefined,
                status: status as string | undefined,
            });

            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Failed to fetch alert history:', { message: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch alert history' });
        }
    }

    /**
     * GET /api/alerts/recent
     * Get recent unacknowledged alerts (for notification bell dropdown)
     */
    async getRecent(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const [alerts, unreadCount] = await Promise.all([
                alertOrchestratorService.getRecentAlerts(companyId, 5),
                alertOrchestratorService.getUnreadCount(companyId),
            ]);

            res.json({ success: true, data: { alerts, unreadCount } });
        } catch (error: any) {
            logger.error('Failed to fetch recent alerts:', { message: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch recent alerts' });
        }
    }

    /**
     * PUT /api/alerts/:id/acknowledge
     */
    async acknowledge(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const alert = await alertOrchestratorService.acknowledgeAlert(req.params.id as string, companyId);
            res.json({ success: true, data: alert });
        } catch (error: any) {
            logger.error('Failed to acknowledge alert:', { message: error.message });
            res.status(404).json({ success: false, error: error.message || 'Alert not found' });
        }
    }

    /**
     * PUT /api/alerts/acknowledge-all
     */
    async acknowledgeAll(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const count = await alertOrchestratorService.acknowledgeAll(companyId);
            res.json({ success: true, data: { acknowledged: count } });
        } catch (error: any) {
            logger.error('Failed to acknowledge all:', { message: error.message });
            res.status(500).json({ success: false, error: 'Failed to acknowledge alerts' });
        }
    }

    /**
     * GET /api/alerts/settings
     */
    async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const settings = await alertOrchestratorService.getSettings(companyId);
            res.json({ success: true, data: settings });
        } catch (error: any) {
            logger.error('Failed to fetch alert settings:', { message: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch settings' });
        }
    }

    /**
     * PUT /api/alerts/settings
     */
    async updateSettings(req: Request, res: Response): Promise<void> {
        try {
            const companyId = (req as any).companyId;
            if (!companyId) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const settings = await alertOrchestratorService.updateSettings(companyId, req.body);
            res.json({ success: true, data: settings });
        } catch (error: any) {
            logger.error('Failed to update alert settings:', { message: error.message });
            res.status(500).json({ success: false, error: 'Failed to update settings' });
        }
    }
}

export const alertsController = new AlertsController();
