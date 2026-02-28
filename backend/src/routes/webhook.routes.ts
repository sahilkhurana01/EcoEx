import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * Publicly accessible webhook endpoints
 * NOTE: In a production environment, you would verify the signature/IP of the sender (Brevo)
 */
router.post('/brevo', webhookController.handleBrevoEvent.bind(webhookController));

export default router;
