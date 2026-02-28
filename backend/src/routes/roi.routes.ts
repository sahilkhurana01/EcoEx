import { Router } from 'express';
import { roiController } from '../controllers/roi.controller';

const router = Router();

router.get('/:companyId', roiController.getDashboardData.bind(roiController));
router.post('/:companyId/export', roiController.exportReport.bind(roiController));

export default router;
