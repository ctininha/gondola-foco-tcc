import express from 'express';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dbPath = path.join(root, 'data', 'gondola-foco.sqlite');
const photosDir = path.join(root, 'data', 'photos');
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

function withDatabase(fn) {
  if (!fs.existsSync(dbPath)) return { missing: true };
  const db = new Database(dbPath, { readonly: true, fileMustExist: true, timeout: 3000 });
  try { db.pragma('query_only = ON'); return fn(db); }
  finally { db.close(); }
}
function readAudit(row) {
  try {
    const result = JSON.parse(row.result_json);
    // Fields from database columns take precedence over potentially inconsistent JSON.
    return { ...result, status: row.status, id: row.id, createdAt: row.created_at, corridor: row.corridor, module: row.module_name };
  } catch { return null; }
}
function summarize(audits) {
  // Only the latest audit of each corridor/module is counted in the current snapshot.
  const latest = new Map();
  for (const audit of audits) {
    const key = JSON.stringify([audit.corridor, audit.module]);
    if (!latest.has(key)) latest.set(key, audit);
  }
  const current = [...latest.values()];
  const totals = { expected: 0, V: 0, A: 0, P: 0, Q: 0, D: 0, positionCount: 0, indeterminate: 0 };
  const occurrences = [];
  const stockActions = { replenishment: 0, purchaseReview: 0, verifyStock: 0 };
  const stockItems = [];
  for (const audit of current) {
    const ind = audit.indicators || {};
    for (const key of Object.keys(totals)) totals[key] += Number(ind[key]) || 0;
    // Cada SKU ausente entra em exatamente uma categoria. Não somar ocorrências
    // de etiqueta/preço, que podem coexistir com a ruptura do mesmo SKU.
    for (const item of audit.items || []) {
      if (item.state !== 'A') continue;
      const stock = item.stockQuantity;
      const category = Number.isSafeInteger(stock) && stock >= 0
        ? (stock > 0 ? 'replenishment' : 'purchaseReview') : 'verifyStock';
      stockActions[category] += 1;
      stockItems.push({ sku: item.sku, name: item.name, stockQuantity: category === 'verifyStock' ? null : stock,
        category, auditId: audit.id, corridor: audit.corridor, module: audit.module,
        createdAt: audit.createdAt });
    }
    for (const occurrence of ind.occurrences || []) {
      occurrences.push({ ...occurrence, auditId: audit.id, createdAt: audit.createdAt, corridor: audit.corridor, module: audit.module });
    }
  }
  const IR = totals.V ? 100 * totals.A / totals.V : null;
  const ICP = totals.V ? 100 * totals.P / totals.V : null;
  const IDP = totals.Q ? 100 * totals.D / totals.Q : null;
  const components = [IR === null ? null : 100 - IR, ICP, IDP === null ? null : 100 - IDP].filter(x => x !== null);
  const IGE = components.length ? Math.round(components.reduce((a,b) => a+b,0)/components.length) : null;
  return { totals, IR, ICP, IDP, IGE, currentModules: current.length, occurrences, stockActions, stockItems, latestAudit: audits[0]?.createdAt || null };
}
app.get('/api/gestao/health', (_req,res) => res.json({ ok:true, storage:'sqlite-readonly', databasePresent:fs.existsSync(dbPath) }));
app.get('/api/gestao/overview', (_req,res) => {
  try {
    const data = withDatabase(db => {
      const rows = db.prepare('SELECT id, created_at, corridor, module_name, status, result_json FROM audits ORDER BY created_at DESC, id DESC').all();
      const audits = rows.map(readAudit).filter(Boolean);
      return { summary:summarize(audits), audits:audits.map(a => ({ id:a.id, createdAt:a.createdAt, corridor:a.corridor, module:a.module, status:a.status, indicators:a.indicators, photoQuality:a.photoQuality })) };
    });
    if (data.missing) return res.json({ summary:summarize([]), audits:[], setupRequired:true });
    return res.json(data);
  } catch (error) { console.error('Erro de leitura da Gestão:', error.message); return res.status(503).json({ error:'Não foi possível ler o banco de auditorias.' }); }
});
app.get('/api/gestao/audits/:id', (req,res) => {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(req.params.id)) return res.status(400).json({error:'ID inválido.'});
  try {
    const data = withDatabase(db => {
      const row = db.prepare('SELECT id, created_at, corridor, module_name, status, result_json FROM audits WHERE id = ?').get(req.params.id);
      return row ? readAudit(row) : null;
    });
    if (data.missing || !data) return res.status(404).json({error:'Auditoria não encontrada.'});
    return res.json(data);
  } catch (error) { console.error('Erro de leitura:',error.message); return res.status(503).json({error:'Não foi possível ler a auditoria.'}); }
});
app.get('/api/gestao/photos/:filename', (req,res) => {
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) return res.status(400).end();
  return res.sendFile(filename, {root:photosDir, dotfiles:'deny'}, err => { if (err && !res.headersSent) res.status(err.status || 404).end(); });
});
app.use(express.static(path.join(here,'public'), {index:'index.html'}));
app.get('/{*path}', (_req,res) => res.sendFile(path.join(here,'public','index.html')));
const port = Number(process.env.GESTAO_PORT || 5174);
app.listen(port, '127.0.0.1', () => console.log(`GôndolaFoco Gestão (somente leitura): http://localhost:${port}`));
