import { Router } from 'express';
import authRoutes from './auth';
import workflowRoutes from './workflows';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workflows', workflowRoutes);

export default router; 