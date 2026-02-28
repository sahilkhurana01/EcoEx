import { Request, Response } from 'express';
import { Alert } from '../models/Alert';
import { logger } from '../utils/logger';

/**
 * Controller to handle external webhook events from providers like Brevo
 */
export class WebhookController {

    /**
     * POST /api/webhooks/brevo
     * Handles event tracking from Brevo SMTP
     * Events: 'request', 'delivered', 'opened', 'clicked', 'invalid_email', 'deferred', 'hard_bounce', 'soft_bounce'
     */
    async handleBrevoEvent(req: Request, res: Response) {
        try {
            const eventData = req.body;

            // Brevo sends 'message-id' or 'messageId' depending on the API/SMTP version
            const messageId = eventData['message-id'] || eventData['messageId'];
            const event = eventData.event; // e.g., 'opened'

            if (!messageId || !event) {
                logger.warn('⚠️ Received malformed Brevo webhook event:', req.body);
                res.status(400).json({ status: 'ignored' });
                return;
            }

            logger.info(`📧 Brevo Email Event: ${event} for message ${messageId}`);

            // Find the alert associated with this message ID
            const alert = await Alert.findOne({ 'emailDelivery.brevoMessageId': messageId });

            if (!alert) {
                // Not finding an alert is normal if the email was sent through other services (not the alert orchestrator)
                res.status(200).json({ status: 'not_tracked' });
                return;
            }

            // Update delivery tracking
            switch (event) {
                case 'opened':
                    alert.emailDelivery.openedAt = new Date();
                    break;
                case 'clicked':
                    alert.emailDelivery.clickedAt = new Date();
                    // If clicked, we can assume it was opened too
                    if (!alert.emailDelivery.openedAt) alert.emailDelivery.openedAt = new Date();
                    break;
                case 'hard_bounce':
                case 'invalid_email':
                case 'error':
                    logger.error(`❌ Alert email bounce: ${messageId} to ${eventData.email}`);
                    alert.status = 'triggered'; // Mark as failed to send? Or keep triggered.
                    break;
            }

            await alert.save();
            res.status(200).json({ status: 'processed' });

        } catch (error: any) {
            logger.error('❌ Error processing Brevo webhook:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const webhookController = new WebhookController();
