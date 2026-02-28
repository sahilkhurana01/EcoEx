import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators';

const router = Router();

// Public
router.post('/clerk-webhook', authController.clerkWebhook.bind(authController));
router.post('/register', authLimiter, validate(registerSchema), authController.register.bind(authController));
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));

// Protected
router.post('/sync', authMiddleware, authController.sync.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
