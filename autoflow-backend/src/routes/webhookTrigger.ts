import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { workflowQueue } from '../workers/workflowQueue';

const router = Router();

// Public webhook endpoint: /api/webhook/:workflowId
router.all('/:workflowId', async (req: Request, res: Response) => {
  const { workflowId } = req.params;
  try {
    // Find the workflow and its user
    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId } });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
    // Enqueue a job with webhook payload as context
    await workflowQueue.add('run', {
      workflowId,
      userId: workflow.userId,
      webhookPayload: {
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
      },
    });
    res.json({ message: 'Workflow triggered', workflowId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to trigger workflow', error: err });
  }
});

export default router; 