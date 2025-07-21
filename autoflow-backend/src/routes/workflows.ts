import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { createWorkflow, getWorkflows, getWorkflow, updateWorkflow, deleteWorkflow, runWorkflow, getWorkflowRuns } from '../controllers/workflowController';

const router = Router();

router.use(authenticate);

router.post('/', createWorkflow);
router.get('/', getWorkflows);
router.get('/:id', getWorkflow);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);
router.post('/:id/run', runWorkflow);
router.get('/:id/runs', getWorkflowRuns);

export default router; 