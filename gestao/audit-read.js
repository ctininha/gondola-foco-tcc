import {calculateIndicators} from '../server/indicators.js';
export function readAudit(row) {
  try {
    const result = JSON.parse(row.result_json);
    // Fields from database columns take precedence over potentially inconsistent JSON.
    // Normalização somente em memória para exibição; não altera registros históricos.
    const items = Array.isArray(result.items) ? result.items.map(item => {
      const local = Boolean(result.planograma?.id) && ["AI_ACCEPTED","HUMAN_CORRECTION"].includes(item.reviewSource);
      const valid = ["P", "F"].includes(item.state) && item.priceRead != null && item.expectedPrice != null &&
        Number.isFinite(Number(item.priceRead)) && Number.isFinite(Number(item.expectedPrice)) &&
        (local || Number(item.priceConfidence) >= 0.85) && ["EVALUABLE", "DIVERGENT"].includes(item.priceStatus);
      const priceStatus = valid
        ? (Math.round(Number(item.priceRead) * 100) === Math.round(Number(item.expectedPrice) * 100) ? "EVALUABLE" : "DIVERGENT")
        : "NOT_APPLICABLE";
      return { ...item, stockQuantity: local ? (item.stockQuantity ?? item.stock ?? null) : item.stockQuantity, priceStatus, priceDivergent: priceStatus === "DIVERGENT" };
    }) : [];
    const indicators = calculateIndicators(items);
    // Manter tratativas humanas já registradas por chave de ocorrência.
    const previous = new Map((result.indicators?.occurrences || []).map(o => [o.occurrenceKey, o]));
    indicators.occurrences = indicators.occurrences.map(o => {
      const old = previous.get(o.occurrenceKey);
      return old ? { ...o, status: old.status, reviewNote: old.reviewNote, statusUpdatedAt: old.statusUpdatedAt } : o;
    });
    return { ...result, items, indicators, status: row.status, id: row.id, createdAt: row.created_at, corridor: row.corridor, module: row.module_name };
  } catch { return null; }
}
export function summarize(audits) {
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
      // Registros históricos podem conter alertas de etiquetas ausentes/ilegíveis.
      // Não os exibir como ocorrências gerenciais de preço.
      if (!["Ruptura", "Posição", "Preço"].includes(occurrence.type)) continue;
      if (occurrence.type === "Preço" && (!["P", "F"].includes(occurrence.state) ||
          occurrence.priceStatus !== "DIVERGENT" || !Number.isFinite(Number(occurrence.priceRead)) ||
          occurrence.priceRead == null || occurrence.expectedPrice == null)) continue;
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
