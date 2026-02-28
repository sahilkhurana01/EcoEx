import { Router } from 'express';
import { matchingController } from '../controllers/matching.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { findMatchesSchema, negotiateSchema, completeMatchSchema } from '../validators';

const router = Router();

router.post('/find', authMiddleware, validate(findMatchesSchema), matchingController.findMatches.bind(matchingController));
router.get('/', authMiddleware, matchingController.getMyMatches.bind(matchingController));
router.get('/:id', authMiddleware, matchingController.getMatch.bind(matchingController));
router.post('/:id/accept', authMiddleware, matchingController.acceptMatch.bind(matchingController));
router.post('/:id/negotiate', authMiddleware, validate(negotiateSchema), matchingController.negotiate.bind(matchingController));
router.post('/:id/complete', authMiddleware, validate(completeMatchSchema), matchingController.complete.bind(matchingController));

export default router;
