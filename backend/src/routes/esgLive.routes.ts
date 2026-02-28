import { Router } from 'express';
import { esgLiveDocumentController } from '../controllers/esgLiveDocument.controller';

const router = Router();

// Full live document snapshot
router.get('/:companyId', (req, res, next) => esgLiveDocumentController.getDocument(req, res, next));

// SSE real-time stream
router.get('/:companyId/stream', (req, res) => esgLiveDocumentController.streamUpdates(req, res));

// Manual refresh + SSE push
router.post('/:companyId/refresh', (req, res, next) => esgLiveDocumentController.refreshDocument(req, res, next));

// Framework-specific data
router.get('/:companyId/framework/:framework', (req, res, next) => esgLiveDocumentController.getFramework(req, res, next));

export default router;
