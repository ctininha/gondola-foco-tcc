import express from "express";
import cors from "cors";
import multer from "multer";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { calculateIndicators } from "./indicators.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const uploadDir = path.join(dataDir, "photos");
const tempDir = path.join(dataDir, "tmp");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const db = new Database(path.join(dataDir, "gondola-foco.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    corridor TEXT NOT NULL,
    module_name TEXT NOT NULL,
    planogram_name TEXT,
    status TEXT NOT NULL,
    result_json TEXT NOT NULL,
    shelf_photo TEXT NOT NULL,
    planogram_photo TEXT NOT NULL
  );
`);

const app = express();
app.use(cors({ origin: process.env.APP_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir, { fallthrough: false }));

const upload = multer({
  dest: tempDir,
  limits: { fileSize: 12 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
      return;
    }
    callback(null, true);
  },
});

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function filePart(file) {
  return {
    inlineData: {
      data: fs.readFileSync(file.path).toString("base64"),
      mimeType: file.mimetype,
    },
  };
}

function parseJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("A IA não retornou JSON válido.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function moneyToCents(value) {
  if (value == null || value === "") return null;
  const raw = typeof value === "number" ? null : String(value).replace(/[R$\s]/g, "");
  const normalized = typeof value === "number"
    ? value
    : Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(normalized) ? Math.round(normalized * 100) : null;
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
}


app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(ai), storage: "sqlite" });
});

app.post(
  "/api/audits",
  upload.fields([
    { name: "shelfPhoto", maxCount: 1 },
    { name: "planogramPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    const shelf = req.files?.shelfPhoto?.[0];
    const planogram = req.files?.planogramPhoto?.[0];

    try {
      if (!shelf || !planogram) {
        return res.status(400).json({ error: "Envie a foto da gôndola e a imagem do planograma." });
      }
      if (!ai) {
        return res.status(503).json({ error: "IA não configurada. Defina GEMINI_API_KEY no arquivo .env e reinicie a API." });
      }

      let planogramItems;
      try {
        planogramItems = JSON.parse(req.body.planogramItems || "[]");
      } catch {
        return res.status(400).json({ error: "A lista de itens do planograma não está em JSON válido." });
      }

      if (!Array.isArray(planogramItems) || planogramItems.length === 0) {
        return res.status(400).json({ error: "Importe os SKUs do módulo antes da análise. Não serão gerados indicadores sem o planograma estruturado." });
      }

      const seenSkus = new Set();
      for (const item of planogramItems) {
        const sku = String(item.sku || "");
        if (!/^\d{8,14}$/.test(sku) || !item.name || !Number.isInteger(Number(item.shelf)) ||
            Number(item.shelf) < 1 || !Number.isInteger(Number(item.position)) || Number(item.position) < 1) {
          return res.status(400).json({ error: "Cada item precisa de código de barras (8 a 14 dígitos), nome, prateleira e posição válidos." });
        }
        if (seenSkus.has(sku)) return res.status(400).json({ error: `SKU duplicado no planograma: ${sku}.` });
        seenSkus.add(sku);
      }

      const prompt = `
Você é um assistente de auditoria visual de gôndolas de supermercado.
A primeira imagem é a foto real da gôndola. A segunda é a imagem de referência do planograma.
Compare a foto com a lista estruturada de SKUs esperados abaixo.
Não invente produtos, etiquetas, preços, faces ou posições.
Use exatamente um registro para cada SKU da lista.
Estados:
P = produto identificado na posição prevista;
F = produto identificado fora da posição prevista;
A = ausência visual confirmável, somente quando a posição/facing esperado estiver claramente vazio;
I = indeterminado quando a foto não permitir concluir com segurança. Não transforme falta de evidência em ruptura.
A confiança deve ser um número entre 0 e 1.
Para preço, só leia etiquetas visíveis e legíveis. Nunca deduza valores.
priceStatus:
EVALUABLE = etiqueta legível e preço igual ao preço cadastrado;
DIVERGENT = etiqueta legível e preço diferente do cadastrado;
ILLEGIBLE = etiqueta presente, mas leitura incerta;
MISSING = etiqueta não encontrada de forma visualmente confiável;
NOT_APPLICABLE = não há preço cadastrado para comparar.
priceConfidence deve ser um número entre 0 e 1. A leitura inferior a 0.85 deve ser tratada como ILLEGIBLE.
Inclua evidência visual curta e objetiva. Se a posição observada não puder ser determinada, use null.
Retorne somente JSON neste formato:
{"items":[{"sku":"...","state":"P|F|A|I","confidence":0.0,"observedPosition":{"shelf":1,"position":1},"evidence":"...","priceRead":null,"priceStatus":"EVALUABLE|DIVERGENT|ILLEGIBLE|MISSING|NOT_APPLICABLE","priceConfidence":0.0}],"summary":"...","photoQuality":"good|usable|poor","manualReviewNotes":[]}
Lista estruturada: ${JSON.stringify(planogramItems)}
      `.trim();

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [prompt, filePart(shelf), filePart(planogram)],
      });
      const parsed = parseJson(response.text);
      if (!Array.isArray(parsed.items)) throw new Error("Resposta da IA sem lista de itens.");

      const bySku = new Map(parsed.items.map(item => [String(item.sku || ""), item]));
      const items = planogramItems.map(expected => {
        const found = bySku.get(String(expected.sku));
        const state = ["P", "F", "A", "I"].includes(found?.state) ? found.state : "I";
        const confidence = normalizeConfidence(found?.confidence);
        const priceConfidence = normalizeConfidence(found?.priceConfidence);
        const expectedCents = moneyToCents(expected.price);
        const readCents = moneyToCents(found?.priceRead);
        const rawPriceStatus = ["EVALUABLE", "DIVERGENT", "ILLEGIBLE", "MISSING", "NOT_APPLICABLE"].includes(found?.priceStatus)
          ? found.priceStatus : "NOT_APPLICABLE";

        let priceStatus = "NOT_APPLICABLE";
        let priceRead = readCents == null ? null : readCents / 100;
        let priceDivergent = false;

        if (expectedCents != null) {
          if (rawPriceStatus === "MISSING") {
            priceStatus = "MISSING";
          } else if (rawPriceStatus === "ILLEGIBLE" || readCents == null || priceConfidence < 0.85) {
            priceStatus = "ILLEGIBLE";
          } else {
            priceDivergent = expectedCents !== readCents;
            priceStatus = priceDivergent ? "DIVERGENT" : "EVALUABLE";
          }
        }

        return {
          sku: String(expected.sku),
          name: String(expected.name),
          brand: expected.brand || null,
          expectedPosition: { shelf: Number(expected.shelf), position: Number(expected.position) },
          expectedFaces: Number(expected.faces || 1),
          expectedPrice: expected.price == null ? null : Number(expected.price),
          state,
          confidence,
          observedPosition: found?.observedPosition && Number.isFinite(Number(found.observedPosition.shelf)) && Number.isFinite(Number(found.observedPosition.position))
            ? { shelf: Number(found.observedPosition.shelf), position: Number(found.observedPosition.position) } : null,
          evidence: String(found?.evidence || "A IA não forneceu evidência suficiente; revisar manualmente."),
          priceRead,
          priceStatus,
          priceConfidence,
          priceDivergent,
        };
      });

      const indicators = calculateIndicators(items);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const shelfName = `${id}-shelf${path.extname(shelf.originalname).toLowerCase() || ".jpg"}`;
      const planogramName = `${id}-planogram${path.extname(planogram.originalname).toLowerCase() || ".jpg"}`;
      const shelfPath = path.join(uploadDir, shelfName);
      const planogramPath = path.join(uploadDir, planogramName);
      fs.renameSync(shelf.path, shelfPath);
      fs.renameSync(planogram.path, planogramPath);

      const result = {
        id,
        createdAt,
        corridor: String(req.body.corridor || "Não informado"),
        module: String(req.body.module || "Não informado"),
        planogramName: String(req.body.planogramName || ""),
        aiSummary: String(parsed.summary || ""),
        photoQuality: ["good", "usable", "poor"].includes(parsed.photoQuality) ? parsed.photoQuality : "usable",
        manualReviewNotes: Array.isArray(parsed.manualReviewNotes) ? parsed.manualReviewNotes.map(String) : [],
        items,
        indicators,
        photos: { shelf: `/uploads/${shelfName}`, planogram: `/uploads/${planogramName}` },
      };

      db.prepare(`
        INSERT INTO audits
        (id, created_at, corridor, module_name, planogram_name, status, result_json, shelf_photo, planogram_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, createdAt, result.corridor, result.module, result.planogramName,
        "processed", JSON.stringify(result), result.photos.shelf, result.photos.planogram,
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error("Falha na auditoria:", error);
      return res.status(502).json({
        error: error.message || "Não foi possível concluir a análise com IA. Nenhum resultado fictício foi criado.",
      });
    } finally {
      for (const file of [shelf, planogram]) {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }
  },
);

app.get("/api/audits", (_req, res) => {
  const rows = db.prepare(`
    SELECT id, created_at, corridor, module_name, result_json
    FROM audits ORDER BY created_at DESC
  `).all();
  res.json(rows.map(row => {
    const result = JSON.parse(row.result_json);
    return {
      id: row.id,
      createdAt: row.created_at,
      corridor: row.corridor,
      module: row.module_name,
      indicators: result.indicators,
      occurrenceCount: result.indicators.occurrences.length,
    };
  }));
});

app.get("/api/audits/:id", (req, res) => {
  const row = db.prepare("SELECT result_json FROM audits WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Auditoria não encontrada." });
  return res.json(JSON.parse(row.result_json));
});

app.patch("/api/audits/:id/occurrences/:occurrenceKey", (req, res) => {
  const row = db.prepare("SELECT result_json FROM audits WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Auditoria não encontrada." });

  const result = JSON.parse(row.result_json);
  const occurrence = result.indicators.occurrences.find(item => item.occurrenceKey === req.params.occurrenceKey);
  if (!occurrence) return res.status(404).json({ error: "Ocorrência não encontrada." });

  const allowed = ["Pendente", "Resolvida", "Justificada", "Contestada"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Status inválido." });
  const note = String(req.body.note || "").trim().slice(0, 500);
  if (req.body.status === "Justificada" && !note) {
    return res.status(400).json({ error: "Informe o motivo da justificativa." });
  }

  occurrence.status = req.body.status;
  occurrence.reviewNote = note;
  occurrence.statusUpdatedAt = new Date().toISOString();
  db.prepare("UPDATE audits SET result_json = ? WHERE id = ?").run(JSON.stringify(result), req.params.id);
  return res.json({ ok: true, occurrence });
});

app.use((error, _req, res, _next) => {
  console.error("Erro na API:", error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Cada imagem deve ter até 12 MB." : "Falha no envio dos arquivos." });
  }
  return res.status(400).json({ error: error.message || "Requisição inválida." });
});

const port = Number(process.env.API_PORT || 3001);
app.listen(port, () => console.log(`GôndolaFoco API disponível em http://localhost:${port}`));
