import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuditDraft } from "../context/AuditContext";
import { createAudit, getAudit, getAudits, getHealth, updateOccurrence } from "../services/auditApi";

const primaryButton = "btn-primary";
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";
const fieldStyle = { width: "100%", minHeight: 48, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 15, background: "white" };
const cardStyle = { border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "white" };

function BottomNav({ active }) {
  const [, setLocation] = useLocation();
  return (
    <nav className="bottom-nav">
      {[["inicio", "Início", "/dashboard", "⌂"], ["historico", "Histórico", "/history", "◷"], ["perfil", "Perfil", "/profile", "○"]].map(([id, label, path, icon]) => (
        <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => setLocation(path)}>
          <span style={{ fontSize: 21 }}>{icon}</span><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function BackHeader({ title, back = "/dashboard", dark = false }) {
  const [, setLocation] = useLocation();
  return <div className="top-bar"><button className="back-btn" style={dark ? { color: "white" } : undefined} onClick={() => setLocation(back)}>‹</button><h1 style={{ fontSize: 20, fontWeight: 700, color: dark ? "white" : "var(--text-main)" }}>{title}</h1></div>;
}

function ErrorBox({ children }) {
  return <div role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: 10, padding: 12, fontSize: 14, margin: "12px 0" }}>{children}</div>;
}

function InfoBox({ children }) {
  return <div style={{ background: "var(--primary-light)", color: "var(--primary-dark)", borderRadius: 10, padding: 12, fontSize: 13, margin: "12px 0" }}>{children}</div>;
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (value.length || row.length) { row.push(value.trim()); rows.push(row); }
      row = []; value = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else value += char;
  }
  if (value.length || row.length) { row.push(value.trim()); rows.push(row); }
  if (rows.length < 2) throw new Error("A planilha precisa ter cabeçalho e pelo menos uma linha.");
  const normalize = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const headers = rows[0].map(normalize);
  return rows.slice(1).filter(r => r.some(c => c.trim())).map((r, index) => {
    const obj = { __line: index + 2 };
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    return obj;
  });
}
function pick(row, names) {
  for (const name of names) if (row[name] !== undefined && row[name] !== "") return row[name];
  return "";
}
function parseMoney(value) {
  if (value === "" || value == null) return null;
  const raw = String(value).replace(/[R$\s]/g, "");
  const cleaned = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
async function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a planilha."));
    reader.readAsText(file, "UTF-8");
  });
}
function formatPercent(value) {
  return value == null ? "Não calculável" : `${Number(value).toFixed(1).replace(".", ",")}%`;
}
function formatPrice(value) {
  return value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}
function statusBadge(status) {
  const style = status === "Resolvida" ? "badge-success" : status === "Contestada" ? "badge-neutral" : status === "Justificada" ? "badge-warning" : "badge-danger";
  return <span className={`badge ${style}`}>{status || "Pendente"}</span>;
}

export function Login() {
  const [, setLocation] = useLocation();
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const entrar = event => {
    event.preventDefault();
    if (!matricula.trim() || !senha.trim()) { setErro("Informe matrícula e senha para entrar no ambiente de demonstração."); return; }
    sessionStorage.setItem("gondola-demo-user", matricula.trim());
    setLocation("/dashboard");
  };
  return (
    <div className="screen-no-nav" style={{ justifyContent: "space-between", paddingTop: 48 }}>
      <div>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--primary)", color: "white", margin: "0 auto 14px", display: "grid", placeItems: "center", fontSize: 34 }}>⌗</div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>GôndolaFoco</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 5 }}>De olho na gôndola, foco no resultado</p>
        </div>
        <form onSubmit={entrar} style={{ display: "grid", gap: 14 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Matrícula<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Sua matrícula" /></label>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Senha<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" /></label>
          {erro && <ErrorBox>{erro}</ErrorBox>}
          <button className={primaryButton} type="submit">Entrar</button>
        </form>
      </div>
      <InfoBox>Ambiente de demonstração do TCC. A autenticação real por matrícula, senha e perfis depende do cadastro de usuários no módulo administrativo.</InfoBox>
    </div>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getAudits().then(data => { if (active) setAudits(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const today = new Date().toLocaleDateString("pt-BR");
  const todays = audits.filter(a => new Date(a.createdAt).toLocaleDateString("pt-BR") === today);
  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 25, fontWeight: 800 }}>Olá!</h1><p style={{ color: "var(--text-muted)", fontSize: 14 }}>GôndolaFoco · Auditoria de execução</p></div>
        <button onClick={() => setLocation("/profile")} style={{ border: 0, borderRadius: 30, width: 44, height: 44, background: "var(--primary-light)", color: "var(--primary)", fontWeight: 800 }}>GF</button>
      </div>
      <div style={{ background: "var(--primary-light)", padding: 18, borderRadius: 16, marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700 }}>Auditorias registradas hoje</div>
        <div style={{ fontSize: 32, fontWeight: 800, margin: "5px 0" }}>{todays.length}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Contagem baseada somente em registros salvos no banco local.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={{ fontSize: 18 }}>Auditorias recentes</h2><button onClick={() => setLocation("/history")} style={{ border: 0, background: "none", color: "var(--primary)", fontWeight: 700 }}>Ver histórico</button></div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {loading ? <p style={{ color: "var(--text-muted)" }}>Carregando auditorias...</p> : audits.length === 0 ? <div style={cardStyle}><strong>Nenhuma auditoria registrada.</strong><p style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 14 }}>Importe o planograma, selecione as fotos e faça a primeira análise real.</p></div> : (
        <div style={{ display: "grid", gap: 10 }}>
          {audits.slice(0, 5).map(a => <button key={a.id} onClick={() => setLocation(`/analyses/${a.id}/result`)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{a.corridor} · {a.module}</strong><span className="badge badge-neutral">{a.indicators?.IGE == null ? "IGE —" : `IGE ${a.indicators.IGE}`}</span></div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>{dateTime(a.createdAt)} · {a.occurrenceCount} ocorrência(s)</div>
          </button>)}
        </div>
      )}
      <div style={{ marginTop: "auto", paddingTop: 22 }}><button className={primaryButton} onClick={() => setLocation("/analyses/new")}>＋ Nova auditoria</button></div>
      <BottomNav active="inicio" />
    </div>
  );
}

export function NewAnalysis() {
  const [, setLocation] = useLocation();
  const { setDraft } = useAuditDraft();
  const [corridor, setCorridor] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [planogramCsv, setPlanogramCsv] = useState(null);
  const [pricesCsv, setPricesCsv] = useState(null);
  const [planogramImage, setPlanogramImage] = useState(null);
  const [items, setItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const importFiles = async () => {
    setError("");
    setWarnings([]);
    setItems([]);
    setReading(true);

    try {
      if (!planogramCsv) throw new Error("Selecione a planilha CSV do planograma.");
      if (!corridor.trim() || !moduleName.trim()) {
        throw new Error("Informe o corredor e o código do módulo.");
      }

      const planRows = parseCsv(await readText(planogramCsv));

      const moduleItems = planRows.map(row => {
        const sku = String(pick(row, ["codigodebarras", "sku", "codigo", "ean"])).trim();
        const name = pick(row, ["nome", "produto", "descricao"]);
        const shelf = Number(pick(row, ["prateleira", "shelf"]));
        const position = Number(pick(row, ["posicao", "position"]));

        if (!/^\d{8,14}$/.test(sku)) {
          throw new Error(`Linha ${row.__line}: código de barras deve ter de 8 a 14 dígitos.`);
        }

        if (!name || !Number.isInteger(shelf) || shelf < 1 ||
            !Number.isInteger(position) || position < 1) {
          throw new Error(`Linha ${row.__line}: confira prateleira, posição e nome.`);
        }

        return { sku, name, shelf, position, price: null };
      });

      if (!moduleItems.length) {
        throw new Error("O planograma não contém produtos.");
      }

      const seenSkus = new Set();
      const seenPositions = new Set();

      for (const item of moduleItems) {
        if (seenSkus.has(item.sku)) {
          throw new Error(`SKU duplicado no planograma: ${item.sku}.`);
        }
        seenSkus.add(item.sku);

        const key = `${item.shelf}:${item.position}`;
        if (seenPositions.has(key)) {
          throw new Error(`Há mais de um SKU na prateleira ${item.shelf}, posição ${item.position}.`);
        }
        seenPositions.add(key);
      }

      const warningList = [];
      let merged = moduleItems;

      if (pricesCsv) {
        const priceRows = parseCsv(await readText(pricesCsv));
        const prices = new Map();

        for (const row of priceRows) {
          const sku = String(pick(row, ["codigodebarras", "sku", "codigo", "ean"])).trim();
          const price = parseMoney(pick(row, ["preco", "valor"]));

          if (!/^\d{8,14}$/.test(sku) || price == null) {
            throw new Error(`Linha ${row.__line} da tabela de preços: confira código de barras e preço.`);
          }

          if (prices.has(sku)) {
            throw new Error(`Há mais de um preço cadastrado para o SKU ${sku}.`);
          }

          prices.set(sku, price);
        }

        merged = moduleItems.map(item => ({
          ...item,
          price: prices.has(item.sku) ? prices.get(item.sku) : null
        }));

        const withoutPrice = merged.filter(item => item.price == null).length;

        if (withoutPrice) {
          warningList.push(`${withoutPrice} SKU(s) não têm preço cadastrado; não serão avaliados no IDP.`);
        }
      } else {
        merged = moduleItems.map(item => ({ ...item, price: null }));
        warningList.push("Tabela de preços não enviada: o IDP não poderá ser calculado nesta auditoria.");
      }

      setItems(merged);
      setWarnings(warningList);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  };

  const continueToCapture = () => {
    if (!items.length) { setError("Importe e valide o planograma antes de continuar."); return; }
    if (!planogramImage) { setError("Selecione também a imagem de referência do planograma."); return; }
    setDraft({ corridor: corridor.trim(), moduleName: moduleName.trim(), planogramName: planogramCsv?.name || "Planograma importado", planogramItems: items, planogramFile: planogramImage, shelfPhoto: null });
    setLocation("/analyses/camera");
  };

  return (
    <div className="screen-no-nav">
      <BackHeader title="Nova auditoria" />
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Selecione o módulo e carregue os arquivos de referência usados na comparação.</p>
      <label style={{ fontSize: 14, fontWeight: 600 }}>Corredor<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} value={corridor} onChange={e => setCorridor(e.target.value)} placeholder="Ex.: Corredor 4 · Laticínios" /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Módulo (código do módulo)<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="Ex.: B" /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 16 }}>1. Planograma em CSV<input style={{ ...fieldStyle, display: "block", marginTop: 6, padding: 9 }} type="file" accept=".csv,text/csv" onChange={e => { setPlanogramCsv(e.target.files?.[0] || null); setItems([]); }} /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>2. Tabela de preços em CSV (recomendado)<input style={{ ...fieldStyle, display: "block", marginTop: 6, padding: 9 }} type="file" accept=".csv,text/csv" onChange={e => { setPricesCsv(e.target.files?.[0] || null); setItems([]); }} /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>3. Imagem do planograma<input style={{ ...fieldStyle, display: "block", marginTop: 6, padding: 9 }} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPlanogramImage(e.target.files?.[0] || null)} /></label>
      <InfoBox>O CSV do planograma deve conter: Prateleira, Posição, Código de barras e Nome. A tabela de preços deve conter: Código de barras e Preço. O módulo é informado separadamente nesta tela.</InfoBox>
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}><a href="/modelos/planograma-exemplo.csv" download>Baixar modelo de planograma</a><a href="/modelos/precos-exemplo.csv" download>Baixar modelo de preços</a></div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {warnings.map(w => <div key={w} style={{ color: "var(--warning-text)", fontSize: 13, marginBottom: 6 }}>⚠ {w}</div>)}
      <button className="btn-outline" style={{ marginTop: 10 }} disabled={reading} onClick={importFiles}>{reading ? "Validando planilhas..." : "Validar planilhas"}</button>
      {items.length > 0 && <div style={{ ...cardStyle, marginTop: 12 }}><strong>{items.length} SKU(s) carregados para o módulo {moduleName}</strong><p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Nenhum indicador será calculado com produtos fora desta lista.</p></div>}
      <div style={{ marginTop: "auto", paddingTop: 18 }}><button className={primaryButton} disabled={!items.length || !planogramImage} onClick={continueToCapture}>Continuar para captura</button></div>
    </div>
  );
}

export function GuidedCamera() {
  const [, setLocation] = useLocation();
  const { draft, setDraft } = useAuditDraft();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!draft.planogramItems.length) setLocation("/analyses/new");
  }, [draft.planogramItems.length, setLocation]);
  useEffect(() => {
    if (!draft.shelfPhoto) { setPreview(""); return; }
    const url = URL.createObjectURL(draft.shelfPhoto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.shelfPhoto]);
  const selectPhoto = file => {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("Use uma imagem JPG, PNG ou WEBP."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("A imagem deve ter até 12 MB."); return; }
    setDraft(current => ({ ...current, shelfPhoto: file }));
  };
  return (
    <div className="screen-no-nav" style={{ background: "#172033", color: "white" }}>
      <BackHeader title="Câmera guiada" back="/analyses/new" dark />
      <p style={{ fontSize: 13, color: "#CBD5E1", marginBottom: 14 }}>Módulo {draft.moduleName} · {draft.corridor}</p>
      <div style={{ border: "1px solid #64748B", borderRadius: 14, minHeight: 260, display: "grid", placeItems: "center", overflow: "hidden", background: "#263449" }}>
        {preview ? <img src={preview} alt="Prévia da foto da gôndola" style={{ width: "100%", maxHeight: 380, objectFit: "contain" }} /> : <div style={{ padding: 24, textAlign: "center", color: "#CBD5E1" }}><div style={{ fontSize: 54 }}>▦</div><p>Selecione uma foto da gôndola para visualizar aqui.</p></div>}
      </div>
      <p style={{ fontSize: 13, color: "#E2E8F0", margin: "14px 0" }}>Enquadre a gôndola inteira, de frente, com boa iluminação e sem pessoas.</p>
      <label style={{ display: "block", background: "white", color: "var(--text-main)", padding: 14, borderRadius: 12, textAlign: "center", fontWeight: 700, cursor: "pointer" }}>
        {draft.shelfPhoto ? "Trocar foto da gôndola" : "Escolher foto / abrir câmera"}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => selectPhoto(e.target.files?.[0])} style={{ display: "none" }} />
      </label>
      <p style={{ fontSize: 12, color: "#CBD5E1", marginTop: 8 }}>No Mac, o seletor permite escolher uma imagem salva no computador. Em celular compatível, pode abrir a câmera.</p>
      {error && <div style={{ color: "#FCA5A5", marginTop: 10 }}>{error}</div>}
      <div style={{ marginTop: "auto", paddingTop: 18, display: "grid", gap: 10 }}>
        <button className={primaryButton} disabled={!draft.shelfPhoto} onClick={() => setLocation("/analyses/review")}>Revisar foto</button>
        <button className="btn-outline" onClick={() => setLocation("/analyses/new")}>Voltar</button>
      </div>
    </div>
  );
}

export function ReviewPhoto() {
  const [, setLocation] = useLocation();
  const { draft } = useAuditDraft();
  const [photoUrl, setPhotoUrl] = useState("");
  useEffect(() => {
    if (!draft.shelfPhoto) { setLocation("/analyses/camera"); return; }
    const url = URL.createObjectURL(draft.shelfPhoto);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.shelfPhoto, setLocation]);
  return (
    <div className="screen-no-nav">
      <BackHeader title="Revisar foto" back="/analyses/camera" />
      {photoUrl && <img src={photoUrl} alt="Foto selecionada para auditoria" style={{ width: "100%", maxHeight: 330, objectFit: "contain", background: "#F1F5F9", borderRadius: 14 }} />}
      <h2 style={{ fontSize: 17, marginTop: 18 }}>Antes de enviar</h2>
      <ul style={{ paddingLeft: 20, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginTop: 8 }}>
        <li>Confira se toda a gôndola está visível.</li><li>Evite reflexos e imagens tremidas.</li><li>Evite fotografar clientes ou funcionários.</li>
      </ul>
      <InfoBox>{draft.planogramItems.length} SKU(s) serão comparados com o planograma carregado. A IA pode indicar itens indeterminados para revisão humana.</InfoBox>
      <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
        <button className={primaryButton} onClick={() => setLocation("/analyses/processing")}>Enviar para análise</button>
        <button className="btn-outline" onClick={() => setLocation("/analyses/camera")}>Refazer / escolher outra foto</button>
      </div>
    </div>
  );
}

export function AnalyzingProcess() {
  const [, setLocation] = useLocation();
  const { draft } = useAuditDraft();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!draft.shelfPhoto || !draft.planogramFile || !draft.planogramItems.length) { setLocation("/analyses/new"); return; }
    let alive = true;
    const timers = [setTimeout(() => alive && setStep(2), 700), setTimeout(() => alive && setStep(3), 1800)];
    createAudit({
      shelfPhoto: draft.shelfPhoto,
      planogramPhoto: draft.planogramFile,
      planogramItems: draft.planogramItems,
      corridor: draft.corridor,
      moduleName: draft.moduleName,
      planogramName: draft.planogramName,
    }).then(result => {
      if (!alive) return;
      setStep(4);
      localStorage.setItem("gondola:last-audit-id", result.id);
      setLocation(`/analyses/${result.id}/result`);
    }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [draft, retry, setLocation]);
  return (
    <div className="screen-no-nav">
      <BackHeader title="Analisando" />
      <div style={{ textAlign: "center", padding: "34px 0" }}><div style={{ width: 116, height: 116, border: "10px solid #E2E8F0", borderTopColor: "var(--primary)", borderRadius: "50%", margin: "0 auto 18px", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800 }}>{step} de 4</div><h2>Analisando sua gôndola</h2><p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Aguarde a resposta do serviço de IA.</p></div>
      {["Foto enviada", "Comparando com o planograma", "Lendo preços legíveis", "Calculando indicadores"].map((label, i) => <div key={label} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0" }}><span>{step > i + 1 ? "✓" : step === i + 1 ? "◉" : "○"}</span><span style={{ fontWeight: step === i + 1 ? 700 : 400 }}>{label}</span></div>)}
      {error && <ErrorBox>{error}</ErrorBox>}
      {error && <div style={{ marginTop: "auto", display: "grid", gap: 10 }}><button className={primaryButton} onClick={() => { setError(""); setStep(1); setRetry(x => x + 1); }}>Tentar novamente</button><button className="btn-outline" onClick={() => setLocation("/analyses/review")}>Voltar à revisão</button></div>}
      {!error && <button className="btn-outline" style={{ marginTop: "auto" }} onClick={() => setLocation("/dashboard")}>Voltar ao início</button>}
    </div>
  );
}

function useAudit(id) {
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getAudit(id).then(data => { if (alive) setAudit(data); }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);
  return { audit, setAudit, error, loading };
}

export function AnalysisResult() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { audit, error, loading } = useAudit(id);
  if (loading) return <div className="screen-no-nav">Carregando resultado real...</div>;
  if (error) return <div className="screen-no-nav"><ErrorBox>{error}</ErrorBox><button className="btn-outline" onClick={() => setLocation("/dashboard")}>Voltar ao início</button></div>;
  const metrics = audit.indicators;
  const occurrenceCount = metrics.occurrences.length;
  return (
    <div className="screen-no-nav">
      <BackHeader title="Resultado" />
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{audit.corridor} · Módulo {audit.module} · {dateTime(audit.createdAt)}</p>
      {audit.planogramName && <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Referência: {audit.planogramName}</p>}
      <div style={{ display: "grid", placeItems: "center", padding: "22px 0" }}>
        <div style={{ width: 150, height: 150, border: "12px solid var(--primary-light)", borderTopColor: "var(--primary)", borderRadius: "50%", display: "grid", placeContent: "center", textAlign: "center" }}>
          <strong style={{ fontSize: 44 }}>{metrics.IGE ?? "—"}</strong><span style={{ fontSize: 12, color: "var(--text-muted)" }}>de 100</span>
        </div>
        <strong style={{ marginTop: 12 }}>Índice geral de execução</strong>
        <span className="badge badge-neutral" style={{ marginTop: 6 }}>{metrics.classification}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ ...cardStyle, textAlign: "center", padding: 10 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Ruptura (IR)</div><strong style={{ fontSize: 19 }}>{formatPercent(metrics.IR)}</strong></div>
        <div style={{ ...cardStyle, textAlign: "center", padding: 10 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Planograma (ICP)</div><strong style={{ fontSize: 19 }}>{formatPercent(metrics.ICP)}</strong></div>
        <div style={{ ...cardStyle, textAlign: "center", padding: 10 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Preço (IDP)</div><strong style={{ fontSize: 19 }}>{formatPercent(metrics.IDP)}</strong><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{metrics.D} item(ns)</div></div>
      </div>
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <strong>{occurrenceCount} ocorrência(s) identificada(s)</strong>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{metrics.A} ruptura(s) · {metrics.positionCount ?? metrics.occurrences.filter(o => o.type === "Posição").length} fora de posição · {metrics.D} divergência(s) de preço</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>SKUs esperados: {metrics.expected} · Avaliáveis: {metrics.V} · Indeterminados: {metrics.indeterminate}</p>
      </div>
      {(metrics.IR == null || metrics.ICP == null || metrics.IDP == null) && <InfoBox>Um ou mais indicadores não puderam ser calculados por falta de itens avaliáveis ou preços vigentes e legíveis. O IGE usa a média dos componentes disponíveis.</InfoBox>}
      {metrics.needsNewPhoto && <ErrorBox>{metrics.indeterminate} item(ns) ficaram indeterminados. A especificação recomenda refazer a foto quando ultrapassam 20% dos itens esperados.</ErrorBox>}
      {audit.photoQuality === "poor" && <ErrorBox>A IA classificou a qualidade da foto como baixa. Revise os itens indeterminados antes de concluir.</ErrorBox>}
      {audit.aiSummary && <div style={{ marginTop: 12, fontSize: 14, color: "var(--text-muted)" }}><strong>Resumo da análise:</strong> {audit.aiSummary}</div>}
      <div style={{ marginTop: "auto", paddingTop: 18, display: "grid", gap: 10 }}>
        <button className={primaryButton} onClick={() => setLocation(`/analyses/${id}/occurrences`)}>{occurrenceCount ? "Ver ocorrências" : "Concluir corredor"}</button>
        <button className="btn-outline" onClick={() => setLocation("/analyses/new")}>Nova auditoria</button>
      </div>
    </div>
  );
}

export function OccurrencesList() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { audit, error, loading, setAudit } = useAudit(id);
  const [filter, setFilter] = useState("Todas");
  const [saving, setSaving] = useState("");
  const items = audit?.indicators?.occurrences || [];
  const visible = items.filter(item => item.status !== "Contestada" && (filter === "Todas" || item.type === filter));
  const treated = items.filter(item => ["Resolvida", "Justificada", "Contestada"].includes(item.status)).length;
  const finish = items.every(item => ["Resolvida", "Justificada", "Contestada"].includes(item.status));
  const changeStatus = async (item, status, note = "") => {
    setSaving(item.occurrenceKey);
    try {
      await updateOccurrence(id, item.occurrenceKey, status, note);
      const updated = await getAudit(id); setAudit(updated);
    } catch (e) { window.alert(e.message); }
    finally { setSaving(""); }
  };
  if (loading) return <div className="screen-no-nav">Carregando ocorrências...</div>;
  if (error) return <div className="screen-no-nav"><ErrorBox>{error}</ErrorBox></div>;
  return (
    <div className="screen-no-nav">
      <BackHeader title="Ocorrências" back={`/analyses/${id}/result`} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
        {["Todas", "Ruptura", "Preço", "Posição", "Preço ilegível", "Etiqueta ausente"].map(type => <button key={type} onClick={() => setFilter(type)} style={{ border: filter === type ? 0 : "1px solid var(--border)", background: filter === type ? "var(--primary)" : "white", color: filter === type ? "white" : "var(--text-main)", borderRadius: 20, padding: "8px 12px", whiteSpace: "nowrap" }}>{type} {type === "Todas" ? items.filter(x => x.status !== "Contestada").length : items.filter(x => x.type === type && x.status !== "Contestada").length}</button>)}
      </div>
      {visible.length === 0 ? <div style={cardStyle}>Nenhuma ocorrência neste filtro.</div> : <div style={{ display: "grid", gap: 10, overflowY: "auto" }}>
        {visible.map(item => <button key={item.occurrenceKey} onClick={() => setLocation(`/analyses/${id}/occurrences/${encodeURIComponent(item.occurrenceKey)}`)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{item.name}</strong>{statusBadge(item.status)}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>SKU {item.sku} · {item.type}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>{item.evidence}</div>
          {saving === item.occurrenceKey && <small>Salvando...</small>}
        </button>)}
      </div>}
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>{treated} de {items.length} tratadas</p>
        <button className={primaryButton} disabled={!finish} onClick={() => setLocation(`/analyses/${id}/success`)}>Concluir tratativa</button>
      </div>
    </div>
  );
}

export function OccurrenceDetail() {
  const { id, occurrenceKey } = useParams();
  const [, setLocation] = useLocation();
  const { audit, error, loading, setAudit } = useAudit(id);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const decodedKey = decodeURIComponent(occurrenceKey || "");
  const item = audit?.indicators?.occurrences?.find(x => x.occurrenceKey === decodedKey);
  const save = async (status, explanation = "") => {
    if (!item) return;
    setBusy(true);
    try {
      await updateOccurrence(id, item.occurrenceKey, status, explanation);
      const fresh = await getAudit(id); setAudit(fresh);
      setLocation(`/analyses/${id}/occurrences`);
    } catch (e) { window.alert(e.message); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="screen-no-nav">Carregando ocorrência...</div>;
  if (error || !item) return <div className="screen-no-nav"><ErrorBox>{error || "Ocorrência não encontrada."}</ErrorBox></div>;
  return (
    <div className="screen-no-nav">
      <BackHeader title={item.type} back={`/analyses/${id}/occurrences`} />
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{item.name}</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>SKU {item.sku} · Prateleira {item.expectedPosition?.shelf}, posição {item.expectedPosition?.position}</p>
      {audit.photos?.shelf && <img src={`${API_ORIGIN}${audit.photos.shelf}`} alt="Foto da gôndola analisada" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, background: "#F1F5F9" }} />}
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <strong>Evidência identificada</strong><p style={{ fontSize: 14, marginTop: 7 }}>{item.evidence}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Confiança da análise: {(Number(item.confidence || 0) * 100).toFixed(0)}%</p>
        {(item.type === "Preço" || item.type === "Preço ilegível" || item.type === "Etiqueta ausente") && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}><div><small>Etiqueta lida</small><strong style={{ display: "block", color: "var(--danger)" }}>{formatPrice(item.priceRead)}</strong></div><div><small>Preço cadastrado</small><strong style={{ display: "block", color: "var(--success)" }}>{formatPrice(item.expectedPrice)}</strong></div></div>}
        {(item.type === "Posição" || item.type === "Ruptura") && <p style={{ fontSize: 13, marginTop: 8 }}>Posição observada: {item.observedPosition ? `prateleira ${item.observedPosition.shelf}, posição ${item.observedPosition.position}` : "não determinada"}</p>}
      </div>
      <div style={{ marginTop: "auto", display: "grid", gap: 10, paddingTop: 18 }}>
        <button className={primaryButton} disabled={busy} onClick={() => save("Resolvida")}>Marcar como resolvido</button>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Não consegui resolver — motivo</label>
        <select style={fieldStyle} value={reason} onChange={e => setReason(e.target.value)}><option value="">Selecione um motivo</option><option>Sem estoque no depósito</option><option>Produto descontinuado</option><option>Etiqueta indisponível</option><option>Outro</option></select>
        {reason === "Outro" && <input style={fieldStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="Descreva o motivo" />}
        <button className="btn-outline" disabled={busy || !reason || (reason === "Outro" && !note.trim())} onClick={() => save("Justificada", reason === "Outro" ? note : reason)}>Registrar justificativa</button>
        <button onClick={() => save("Contestada", note || "Funcionário sinalizou alerta incorreto")} style={{ border: 0, background: "none", color: "var(--danger)", padding: 10 }}>Este alerta está incorreto</button>
      </div>
    </div>
  );
}

export function AnalysisSuccess() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { audit, error, loading } = useAudit(id);
  if (loading) return <div className="screen-no-nav">Carregando conclusão...</div>;
  if (error) return <div className="screen-no-nav"><ErrorBox>{error}</ErrorBox></div>;
  const all = audit.indicators.occurrences || [];
  const done = all.filter(x => ["Resolvida", "Justificada", "Contestada"].includes(x.status)).length;
  return <div className="screen-no-nav" style={{ textAlign: "center", justifyContent: "center" }}>
    <div style={{ width: 76, height: 76, borderRadius: 50, background: "var(--success-bg)", color: "var(--success)", display: "grid", placeItems: "center", fontSize: 42, margin: "0 auto 18px" }}>✓</div>
    <h1 style={{ fontSize: 24 }}>Tratativa registrada</h1>
    <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{audit.corridor} · Módulo {audit.module}</p>
    <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 24 }}><div><strong style={{ fontSize: 28 }}>{audit.indicators.IGE ?? "—"}</strong><p style={{ fontSize: 12, color: "var(--text-muted)" }}>IGE original</p></div><div><strong style={{ fontSize: 28 }}>{done}/{all.length}</strong><p style={{ fontSize: 12, color: "var(--text-muted)" }}>ocorrências tratadas</p></div></div>
    <InfoBox>A nota exibida é a da auditoria original. Para comprovar as correções e atualizar os indicadores, faça uma nova auditoria com outra foto.</InfoBox>
    <div style={{ display: "grid", gap: 10, marginTop: 28 }}><button className={primaryButton} onClick={() => setLocation("/analyses/new")}>Nova auditoria</button><button className="btn-outline" onClick={() => setLocation("/dashboard")}>Voltar ao início</button></div>
  </div>;
}

export function History() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState(7);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { getAudits().then(setAudits).catch(e => setError(e.message)); }, []);
  const filtered = useMemo(() => audits.filter(a => Date.now() - new Date(a.createdAt).getTime() <= period * 86400000), [audits, period]);
  const scores = filtered.map(a => a.indicators?.IGE).filter(v => v != null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  return <div className="screen">
    <h1 style={{ fontSize: 25, fontWeight: 800, marginBottom: 16 }}>Histórico</h1>
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{[7, 30, 90].map(n => <button key={n} onClick={() => setPeriod(n)} style={{ border: period === n ? 0 : "1px solid var(--border)", background: period === n ? "var(--primary)" : "white", color: period === n ? "white" : "var(--text-main)", borderRadius: 20, padding: "8px 14px" }}> {n} dias </button>)}</div>
    <div style={{ ...cardStyle, marginBottom: 18 }}><span style={{ color: "var(--text-muted)", fontSize: 13 }}>IGE médio do período</span><div style={{ fontSize: 34, fontWeight: 800 }}>{average ?? "—"}</div><small>{scores.length} auditoria(s) com IGE calculável</small></div>
    {error && <ErrorBox>{error}</ErrorBox>}
    {filtered.length === 0 ? <div style={cardStyle}>Ainda não há auditorias neste período.</div> : <div style={{ display: "grid", gap: 10 }}>{filtered.map(a => <button key={a.id} onClick={() => setLocation(`/analyses/${a.id}/result`)} style={{ ...cardStyle, textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>{a.corridor} · {a.module}</strong><strong>{a.indicators?.IGE ?? "—"}</strong></div><p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>{dateTime(a.createdAt)} · {a.occurrenceCount} ocorrência(s)</p></button>)}</div>}
    <BottomNav active="historico" />
  </div>;
}

export function Profile() {
  const [, setLocation] = useLocation();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getHealth().then(setHealth).catch(e => setError(e.message)); }, []);
  return <div className="screen">
    <h1 style={{ fontSize: 25, fontWeight: 800, marginBottom: 24 }}>Perfil</h1>
    <div style={{ textAlign: "center", padding: 18, ...cardStyle }}><div style={{ width: 68, height: 68, borderRadius: 50, background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px", fontSize: 25, fontWeight: 800 }}>GF</div><strong>Funcionário · ambiente de demonstração</strong><p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 5 }}>Matrícula: {sessionStorage.getItem("gondola-demo-user") || "não informada"}</p></div>
    <div style={{ marginTop: 20, ...cardStyle }}><strong>Status do serviço</strong><p style={{ marginTop: 8, fontSize: 14 }}>{health ? (health.aiConfigured ? "API conectada · IA configurada" : "API conectada · chave de IA não configurada") : error || "Verificando conexão..."}</p></div>
    <InfoBox>As imagens enviadas são armazenadas no diretório local protegido do projeto. O prazo de retenção ainda precisa ser configurado com a loja e validado juridicamente.</InfoBox>
    <div style={{ marginTop: "auto", display: "grid", gap: 10 }}><button className="btn-outline" onClick={() => setLocation("/dashboard")}>Voltar ao início</button><button className="btn-danger-outline" onClick={() => { sessionStorage.removeItem("gondola-demo-user"); setLocation("/"); }}>Sair</button></div>
    <BottomNav active="perfil" />
  </div>;
}

export function NotFound() {
  const [, setLocation] = useLocation();
  return <div className="screen-no-nav"><h1>Página não encontrada</h1><button className={primaryButton} onClick={() => setLocation("/dashboard")}>Voltar ao início</button></div>;
}
