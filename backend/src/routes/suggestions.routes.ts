import { Router } from 'express';
import { suggestionController } from '../controllers/suggestion.controller';

const router = Router();

// Generate new AI suggestions
router.post('/:companyId/generate', (req, res, next) => suggestionController.generate(req, res, next));

// List suggestions with filtering
router.get('/:companyId', (req, res, next) => suggestionController.list(req, res, next));

// Update suggestion status
router.patch('/:id/status', (req, res, next) => suggestionController.updateStatus(req, res, next));

export default router;
