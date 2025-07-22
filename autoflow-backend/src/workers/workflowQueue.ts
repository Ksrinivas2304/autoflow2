import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../models/prisma';
import { nodeSchemas } from '../../../shared/nodeSchemas';
import nodemailer from 'nodemailer';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import fetch from 'node-fetch';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const workflowQueue = new Queue('workflow', { connection });

function validateNodeConfig(node: any): { valid: boolean; errors: string[] } {
  const schema = nodeSchemas[node.type as keyof typeof nodeSchemas];
  if (!schema) return { valid: false, errors: [
    `Unknown node type: ${node.type}`
  ] };
  const errors: string[] = [];
  for (const [key, param] of Object.entries(schema.parameters) as [string, any][]) {
    if (param.required && (node.config?.[key] === undefined || node.config[key] === '')) {
      errors.push(`Missing required field: ${key}`);
    }
    if (param.type && node.config?.[key] !== undefined) {
      const val = node.config[key];
      if (param.type === 'number' && typeof val !== 'number') errors.push(`Field ${key} must be a number`);
      if (param.type === 'string' && typeof val !== 'string') errors.push(`Field ${key} must be a string`);
      if (param.type === 'array' && !Array.isArray(val)) errors.push(`Field ${key} must be an array`);
      if (param.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) errors.push(`Field ${key} must be an object`);
    }
  }
  return { valid: errors.length === 0, errors };
}

async function executeNode(node: any, userId: string, context: any = {}) {
  switch (node.type) {
    case 'webhook': {
      // Return the webhook payload as the result
      return context;
    }
    case 'send_email': {
      const { provider, to, subject, body } = node.config;
      function getByPath(obj: any, path: string) {
        return path.split('.').reduce((o, k) => (o ? o[k] : ''), obj);
      }
      // Merge context.body into context for template resolution
      let templateContext = { ...context };
      if (context.body && typeof context.body === 'object') {
        templateContext = { ...context, ...context.body };
      }
      const resolvedTo = to.replace(/{{\s*data\.([\w.]+)\s*}}/g, (_: string, k: string) => getByPath(templateContext, k) || '');
      const resolvedSubject = subject.replace(/{{\s*data\.([\w.]+)\s*}}/g, (_: string, k: string) => getByPath(templateContext, k) || '');
      const resolvedBody = body.replace(/{{\s*data\.([\w.]+)\s*}}/g, (_: string, k: string) => getByPath(templateContext, k) || '');
      console.log('Resolved To:', resolvedTo, 'Raw To:', to, 'Context:', context);
      // Use Mailtrap or Gmail for dev
      const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: Number(process.env.MAILTRAP_PORT),
        secure: process.env.MAILTRAP_PORT === '465',
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      });
      await transporter.sendMail({
        from: 'noreply@example.com',
        to: resolvedTo,
        subject: resolvedSubject,
        html: resolvedBody,
      });
      console.log(`Email sent to ${resolvedTo}`);
      return { to: resolvedTo, subject: resolvedSubject, body: resolvedBody };
    }
    case 'slack': {
      // Fetch user's Slack token
      const integration = await prisma.userIntegration.findFirst({ where: { userId, provider: 'slack' } });
      if (!integration) throw new Error('Slack not connected');
      const { channel, message } = node.config;
      // Send message using Slack API
      await axios.post('https://slack.com/api/chat.postMessage', {
        channel,
        text: message,
      }, {
        headers: { Authorization: `Bearer ${integration.accessToken}` },
      });
      console.log(`Slack message sent to ${channel}`);
      break;
    }
    case 'api_request': {
      let { method, url, headers, body, queryParams } = node.config;
      if (url && !/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
      }
      const res = await axios({ method, url, headers, data: body, params: queryParams });
      console.log(`API request to ${url} responded with status ${res.status}`);
      return {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
      };
    }
    case 'postgres': {
      const { query } = node.config;
      if (!/^\s*select/i.test(query)) throw new Error('Only SELECT queries allowed');
      const result = await prisma.$queryRawUnsafe(query);
      console.log('Postgres query result:', result);
      break;
    }
    case 'pdf_extract': {
      const { fileUrl } = node.config;
      if (!fileUrl) throw new Error('No PDF URL provided');
      // Download the PDF
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to download PDF');
      const buffer = await response.buffer();
      // Extract text
      const data = await pdfParse(buffer);
      return { text: data.text };
    }
    default: {
      // Mock for other nodes
      console.log(`Mock execution for node: ${node.type}`);
      return context;
    }
  }
}

async function executeWorkflowGraph(nodes: any[], edges: any[], userId: string, context: any = {}, startNodeId?: string) {
  const nodeMap = Object.fromEntries(nodes.map((n: any) => [n.id, n]));
  const edgeMap: Record<string, string[]> = {};
  for (const e of edges) {
    if (!edgeMap[e.source]) edgeMap[e.source] = [];
    edgeMap[e.source].push(e.target);
  }
  // Find trigger nodes (no incoming edges)
  const allTargets = new Set(edges.map((e: any) => e.target));
  const triggerNodes = nodes.filter((n: any) => !allTargets.has(n.id));
  let lastResult: any = context;
  async function runNode(nodeId: string, ctx: any): Promise<any> {
    const node = nodeMap[nodeId];
    if (!node) return ctx;
    if (node.data.type === 'webhook' && ctx) {
      // Pass webhookPayload as context to next nodes
      let result = ctx;
      for (const nextId of edgeMap[nodeId] || []) {
        result = await runNode(nextId, { ...ctx });
      }
      return result;
    }
    const { valid, errors } = validateNodeConfig(node.data || {});
    if (!valid) {
      console.error(`Node ${node.id} (${node.data?.label || node.type}) is invalid:`, errors);
      return ctx;
    }
    try {
      const result = await executeNode(node.data, userId, ctx);
      let finalResult = { ...ctx, ...result };
      for (const nextId of edgeMap[nodeId] || []) {
        finalResult = await runNode(nextId, finalResult);
      }
      return finalResult;
    } catch (err) {
      console.error(`Error executing node ${node.id} (${node.data?.label || node.type}):`, err);
      return ctx;
    }
  }
  if (startNodeId) {
    lastResult = await runNode(startNodeId, context);
  } else {
    for (const trigger of triggerNodes) {
      lastResult = await runNode(trigger.id, context);
    }
  }
  return lastResult;
}

export async function addWorkflowJob(workflowId: string, userId: string) {
  await workflowQueue.add('run', { workflowId, userId });
}

// Worker to process workflow jobs
export const workflowWorker = new Worker('workflow', async (job: Job) => {
  const { workflowId, userId, webhookPayload } = job.data;
  // Load workflow from DB
  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!workflow) throw new Error('Workflow not found');
  const data = (workflow.data ?? {}) as { nodes?: any[]; edges?: any[] };
  console.log(`Executing workflow: ${workflow.name}`);
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      status: 'running',
      startedAt: new Date(),
    },
  });
  let status = 'completed';
  let result: any = {};
  try {
    result = await executeWorkflowGraph(data.nodes ?? [], data.edges ?? [], userId, webhookPayload, job.data.startNodeId);
  } catch (err) {
    status = 'failed';
    result = { error: err instanceof Error ? err.message : String(err) };
  }
  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status,
      result,
      finishedAt: new Date(),
    },
  });
  return { status };
}, { connection }); 