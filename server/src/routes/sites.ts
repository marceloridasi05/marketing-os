import { Router } from 'express';
import { db } from '../db/index.js';
import { sites } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const stringify = (v: unknown) =>
  v === undefined ? undefined : (typeof v === 'string' ? v : JSON.stringify(v));

router.get('/', async (_req, res) => {
  const rows = await db.select().from(sites).orderBy(sites.name);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [row] = await db.select().from(sites).where(eq(sites.id, +req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const { name, url, sheetConfig, clientConfig } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  // If no sheet provided, store '{}' explicitly so the DB migration
  // (which only patches NULL rows) doesn't assign the default sheet to this site.
  const sheetConfigStr = sheetConfig !== undefined ? stringify(sheetConfig) : '{}';
  const clientConfigStr = clientConfig !== undefined ? stringify(clientConfig) : null;
  const [row] = await db.insert(sites).values({
    name, url,
    sheetConfig: sheetConfigStr,
    clientConfig: clientConfigStr,
  }).returning();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { name, url, sheetConfig, clientConfig } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (url !== undefined) updates.url = url;
  if (sheetConfig !== undefined) updates.sheetConfig = stringify(sheetConfig);
  if (clientConfig !== undefined) updates.clientConfig = stringify(clientConfig);
  const [row] = await db.update(sites).set(updates).where(eq(sites.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const [row] = await db.delete(sites).where(eq(sites.id, +req.params.id)).returning();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
