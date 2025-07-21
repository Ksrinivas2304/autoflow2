import prisma from '../models/prisma';
import { Request, Response } from 'express';
import { addWorkflowJob, workflowQueue, workflowWorker } from '../workers/workflowQueue';
import { nodeSchemas } from '../../../shared/nodeSchemas';

export const createWorkflow = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name, data } = req.body;
  if (!name || !data) return res.status(400).json({ message: 'Name and data required' });
  try {
    const workflow = await prisma.workflow.create({
      data: { name, data, userId },
    });
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Create workflow failed', error: err });
  }
};

export const getWorkflows = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const workflows = await prisma.workflow.findMany({ where: { userId } });
    res.json(workflows);
  } catch (err) {
    res.status(500).json({ message: 'Fetch workflows failed', error: err });
  }
};

export const getWorkflow = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  try {
    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Fetch workflow failed', error: err });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { name, data } = req.body;
  try {
    const workflow = await prisma.workflow.updateMany({
      where: { id, userId },
      data: { name, data },
    });
    if (workflow.count === 0) return res.status(404).json({ message: 'Workflow not found' });
    res.json({ message: 'Workflow updated' });
  } catch (err) {
    res.status(500).json({ message: 'Update workflow failed', error: err });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  try {
    const workflow = await prisma.workflow.deleteMany({ where: { id, userId } });
    if (workflow.count === 0) return res.status(404).json({ message: 'Workflow not found' });
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete workflow failed', error: err });
  }
};

export const runWorkflow = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  try {
    // Load workflow from DB
    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
    const data = (workflow.data ?? {}) as { nodes?: any[]; edges?: any[] };
    const validationErrors: any[] = [];
    for (const node of data.nodes ?? []) {
      const schema = nodeSchemas[node.data?.type as keyof typeof nodeSchemas];
      if (!schema) continue;
      const errors: string[] = [];
      for (const [key, param] of Object.entries(schema.parameters) as [string, any][]) {
        if (param.required && (node.data?.config?.[key] === undefined || node.data.config[key] === '')) {
          errors.push(`Missing required field: ${key}`);
        }
        if (param.type && node.data?.config?.[key] !== undefined) {
          const val = node.data.config[key];
          if (param.type === 'number' && typeof val !== 'number') errors.push(`Field ${key} must be a number`);
          if (param.type === 'string' && typeof val !== 'string') errors.push(`Field ${key} must be a string`);
          if (param.type === 'array' && !Array.isArray(val)) errors.push(`Field ${key} must be an array`);
          if (param.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) errors.push(`Field ${key} must be an object`);
        }
      }
      if (errors.length > 0) {
        validationErrors.push({ nodeId: node.id, label: node.data?.label, errors });
      }
    }
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }
    await workflowQueue.add('run', { workflowId: id, userId });
    res.json({ message: 'Workflow execution started' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start workflow', error: err });
  }
};

export const getWorkflowRuns = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  try {
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id, userId },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch run history', error: err });
  }
}; 