import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class N8nService {
    private webhookUrl = env.N8N_WEBHOOK_URL || '';

    async triggerMatchFound(matchData: any): Promise<void> {
        if (!this.webhookUrl) return;
        try {
            await axios.post(`${this.webhookUrl}/match-found`, {
                matchId: matchData._id,
                sellerId: matchData.sellerId,
                buyerId: matchData.buyerId,
                matchScore: matchData.matchScore,
                timestamp: new Date().toISOString(),
            });
            logger.info(`n8n: match-found triggered for ${matchData._id}`);
        } catch (error) {
            logger.warn('n8n match-found trigger failed (non-critical):', (error as Error).message);
        }
    }

    async triggerDealCompleted(matchData: any): Promise<void> {
        if (!this.webhookUrl) return;
        try {
            await axios.post(`${this.webhookUrl}/deal-completed`, {
                matchId: matchData._id,
                passportId: matchData.passportId,
                impact: matchData.actualImpact,
                timestamp: new Date().toISOString(),
            });
            logger.info(`n8n: deal-completed triggered for ${matchData._id}`);
        } catch (error) {
            logger.warn('n8n deal-completed trigger failed (non-critical):', (error as Error).message);
        }
    }

    async triggerDisputeRaised(matchId: string, reason: string): Promise<void> {
        if (!this.webhookUrl) return;
        try {
            await axios.post(`${this.webhookUrl}/dispute-raised`, {
                matchId,
                reason,
                urgency: 'high',
                timestamp: new Date().toISOString(),
            });
            logger.info(`n8n: dispute-raised triggered for ${matchId}`);
        } catch (error) {
            logger.warn('n8n dispute-raised trigger failed (non-critical):', (error as Error).message);
        }
    }
}

export const n8nService = new N8nService();
