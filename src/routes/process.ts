import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../db';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

function toInt(value: unknown): number {
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

// Оборачивает async-хэндлер, чтобы ошибки попадали в Express error handler
function wrap(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => fn(req, res).catch(next);
}

// Форматирует запись из БД в ответ для фронтенда
function formatProcess(p: any) {
  return {
    process_id: p.id,
    id: p.id,
    name: p.name,
    nodes: (p.nodes ?? []).map((n: any) => ({
      id: n.nodeId,
      type: n.type,
      data: n.data,
      json_data: n.jsonData,
      subprocess_id: n.subprocessId ?? null,
      subprocessId: n.subprocessId ?? null,
    })),
    edges: (p.edges ?? []).map((e: any) => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      ...(e.label != null && { label: e.label }),
      ...(e.data != null && { data: e.data }),
      ...(e.sourceHandle != null && { sourceHandle: e.sourceHandle }),
      ...(e.targetHandle != null && { targetHandle: e.targetHandle }),
      ...(e.style != null && { style: e.style }),
    })),
  };
}

function buildNodeData(n: any) {
  return {
    nodeId: toInt(n.id),
    type: n.type ?? 3,
    data: n.data ?? {},
    jsonData: n.json_data ?? { x: 0, y: 0 },
    subprocessId: parseUuid(n.subprocess_id),
  };
}

function buildEdgeData(e: any) {
  return {
    edgeId: toInt(e.id),
    source: toInt(e.source),
    target: toInt(e.target),
    label: e.label ?? null,
    data: e.data ?? null,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    style: e.style ?? null,
  };
}

// GET /v1/process/all
router.get(
  '/all',
  wrap(async (_req, res) => {
    const processes = await prisma.process.findMany({ select: { id: true, name: true } });
    res.json(processes.map((p) => ({ process_id: p.id, name: p.name })));
  }),
);

// GET /v1/process?process_id=...
router.get(
  '/',
  wrap(async (req, res) => {
    const process_id = req.query.process_id as string | undefined;
    if (!process_id) return void res.status(400).json({ detail: 'process_id is required' });

    const process = await prisma.process.findUnique({
      where: { id: process_id },
      include: { nodes: true, edges: true },
    });
    if (!process) return void res.status(404).json({ detail: 'Process not found' });

    res.json(formatProcess(process));
  }),
);

// POST /v1/process
router.post(
  '/',
  wrap(async (req, res) => {
    const { name = '', nodes = [], edges = [] } = req.body ?? {};

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.process.create({ data: { name } });

      for (const n of nodes) {
        await tx.node.create({ data: { processId: created.id, ...buildNodeData(n) } });
      }
      for (const e of edges) {
        await tx.edge.create({ data: { processId: created.id, ...buildEdgeData(e) } });
      }

      return tx.process.findUnique({
        where: { id: created.id },
        include: { nodes: true, edges: true },
      });
    });

    res.status(201).json(formatProcess(result));
  }),
);

// PUT /v1/process
router.put(
  '/',
  wrap(async (req, res) => {
    const { process_id, name = '', nodes = [], edges = [] } = req.body ?? {};
    if (!process_id) return void res.status(400).json({ detail: 'process_id is required' });

    const existing = await prisma.process.findUnique({ where: { id: process_id } });
    if (!existing) return void res.status(404).json({ detail: 'Process not found' });

    await prisma.$transaction(async (tx) => {
      await tx.node.deleteMany({ where: { processId: process_id } });
      await tx.edge.deleteMany({ where: { processId: process_id } });
      await tx.process.update({ where: { id: process_id }, data: { name } });

      for (const n of nodes) {
        await tx.node.create({ data: { processId: process_id, ...buildNodeData(n) } });
      }
      for (const e of edges) {
        await tx.edge.create({ data: { processId: process_id, ...buildEdgeData(e) } });
      }
    });

    const updated = await prisma.process.findUnique({
      where: { id: process_id },
      include: { nodes: true, edges: true },
    });

    res.json(formatProcess(updated));
  }),
);

// DELETE /v1/process?process_id=...
router.delete(
  '/',
  wrap(async (req, res) => {
    const process_id = req.query.process_id as string | undefined;
    if (!process_id) return void res.status(400).json({ detail: 'process_id is required' });

    const existing = await prisma.process.findUnique({ where: { id: process_id } });
    if (!existing) return void res.status(404).json({ detail: 'Process not found' });

    await prisma.process.delete({ where: { id: process_id } });
    res.status(204).send();
  }),
);

export default router;
