import { Router } from 'express';
import { passportController } from '../controllers/passport.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public verification
router.get('/verify/:passportNumber', passportController.verify.bind(passportController));

// Protected
router.get('/', authMiddleware, passportController.list.bind(passportController));
router.get('/:id', authMiddleware, passportController.getById.bind(passportController));

export default router;
