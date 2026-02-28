import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators';

const router = Router();

router.post('/', authMiddleware, validate(createCompanySchema), companyController.create.bind(companyController));
router.get('/', authMiddleware, companyController.list.bind(companyController));
router.get('/nearby', authMiddleware, companyController.nearby.bind(companyController));
router.get('/:id', authMiddleware, companyController.getById.bind(companyController));
router.put('/:id', authMiddleware, validate(updateCompanySchema), companyController.update.bind(companyController));
router.get('/:id/analytics', authMiddleware, companyController.getAnalytics.bind(companyController));

export default router;
