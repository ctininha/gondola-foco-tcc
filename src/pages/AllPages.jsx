import LocalResult from "./LocalResult";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useAuditDraft } from "../context/useAuditDraft";
import { createLocalPreview, createAudit, getAudit, getAudits, getHealth } from "../services/auditApi";
import { BottomNav } from "../components/SharedUI";

const primaryButton = "btn-primary";
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";
const fieldStyle = { width: "100%", minHeight: 48, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 15, background: "white" };
const cardStyle = { border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "white" };


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
function formatPrice(value) {
  return value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
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
          <img src="/favicon.svg" alt="Símbolo GôndolaFoco" style={{ width: 72, height: 72, display: "block", margin: "0 auto 14px" }} />
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
  const [pending,setPending]=useState([]);
  useEffect(()=>{fetch(API_ORIGIN+"/api/auditoria-v12/jobs").then(r=>{if(!r.ok)throw Error("Falha ao carregar pendências");return r.json();}).then(setPending).catch(e=>setError(e.message));},[]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getAudits().then(data => { if (active) setAudits(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const [today] = useState(() => new Date().toLocaleDateString("pt-BR"));
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
      {pending.length>0&&<section className="lr" style={{marginBottom:20}}><h2>Auditorias pendentes ({pending.length})</h2>{pending.map(p=><div className="lr-panel" key={p.id}><strong>{p.gondola}</strong><p>{p.loja} · {p.setor}</p><small>{dateTime(p.createdAt)} · IGE {p.IGE}</small><button className="btn-primary" style={{marginTop:12}} onClick={()=>{localStorage.setItem("gondola:v12-job",p.id);setLocation("/analyses/processing");}}>Continuar auditoria</button></div>)}</section>}
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
      <div style={{ marginTop: "auto", paddingTop: 22 }}><button className={primaryButton} onClick={() => {localStorage.removeItem("gondola:v12-job");setLocation("/analyses/new");}}>＋ Nova auditoria</button></div>
      <BottomNav active="inicio" />
    </div>
  );
}

export function NewAnalysis(){
 const [,go]=useLocation();const {setDraft}=useAuditDraft();const [rows,setRows]=useState([]),[id,setId]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[legacy,setLegacy]=useState(false);
 useEffect(()=>{fetch(API_ORIGIN+'/api/planogramas-aprovados').then(async r=>{if(!r.ok)throw Error('Não foi possível consultar planogramas');return r.json();}).then(setRows).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const selected=rows.find(r=>r.id===id);const photo=selected?API_ORIGIN+'/api/planogramas-aprovados/'+selected.id+'/foto':'';
 if(legacy)return <LegacyNewAnalysis/>;
 return <div className="screen-no-nav"><BackHeader title="Nova auditoria"/><p>Selecione o planograma aprovado para o setor.</p><label style={{display:'grid',gap:10,margin:'20px 0'}}>Loja · Setor · Gôndola<select style={fieldStyle} value={id} onChange={e=>setId(e.target.value)}><option value="">Selecione</option>{rows.map(r=><option key={r.id} value={r.id}>{r.loja} · {r.setor} · {r.gondola} (v{r.version})</option>)}</select></label>{loading&&<p>Carregando...</p>}{error&&<ErrorBox>{error}</ErrorBox>}{!loading&&!rows.length&&!error&&<InfoBox>Nenhum planograma aprovado.</InfoBox>}{selected&&<div style={cardStyle}><strong>Referência aprovada · {selected.items.length} produtos</strong><img src={photo} alt="Fotografia do planograma" style={{width:'100%',marginTop:12,borderRadius:10}}/>{[...new Set(selected.items.map(i=>i.shelf))].map(n=><details key={n} style={{marginTop:12}}><summary>Prateleira {n}</summary>{selected.items.filter(i=>i.shelf===n).sort((a,b)=>a.position-b.position).map(i=><p key={i.sku}>{i.position}. {i.name} · {i.unidades} un.</p>)}</details>)}</div>}<button className={primaryButton} style={{marginTop:20}} disabled={!selected} onClick={()=>{setDraft({corridor:selected.setor,moduleName:selected.gondola,planogramName:selected.setor+' v'+selected.version,planogramItems:selected.items.map(i=>({...i,price:i.systemPrice,stockQuantity:i.stock})),planogramaId:selected.id,referenceUrl:photo,engine:'local',shelfPhoto:null});go('/analyses/camera');}}>Continuar para captura</button><button className="btn-outline" style={{marginTop:12}} onClick={()=>setLegacy(true)}>Importação manual (legado)</button></div>;
}
function LegacyNewAnalysis() {
  const [, setLocation] = useLocation();
  const { setDraft } = useAuditDraft();
  const [corridor, setCorridor] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [planogramCsv, setPlanogramCsv] = useState(null);
  const [pricesCsv, setPricesCsv] = useState(null);
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

          const rawStock = pick(row, ["quantidadeestoque", "estoque", "saldoestoque"]);
          const stock = rawStock === "" ? null : Number(String(rawStock).trim());
          if (rawStock !== "" && (!/^\d+$/.test(String(rawStock).trim()) || !Number.isSafeInteger(stock))) {
            throw new Error(`Linha ${row.__line} da tabela de preços: estoque deve ser inteiro não negativo ou ficar em branco.`);
          }
          prices.set(sku, { price, stock });
        }

        merged = moduleItems.map(item => ({
          ...item,
          price: prices.has(item.sku) ? prices.get(item.sku).price : null,
          stockQuantity: prices.has(item.sku) ? prices.get(item.sku).stock : null
        }));

        const withoutPrice = merged.filter(item => item.price == null).length;

        if (withoutPrice) {
          warningList.push(`${withoutPrice} SKU(s) não têm preço cadastrado; não serão avaliados no IDP.`);
        }
      } else {
        merged = moduleItems.map(item => ({ ...item, price: null, stockQuantity: null }));
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
    setDraft({ corridor: corridor.trim(), moduleName: moduleName.trim(), planogramName: planogramCsv?.name || "Planograma importado", planogramItems: items, shelfPhoto: null, engine: "gemini", referencePhoto: null });
    setLocation("/analyses/camera");
  };

  return (
    <div className="screen-no-nav">
      <BackHeader title="Nova auditoria" />
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Selecione o módulo e carregue os arquivos de referência usados na comparação.</p>
      <label style={{ fontSize: 14, fontWeight: 600 }}>Corredor<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} value={corridor} onChange={e => setCorridor(e.target.value)} placeholder="Ex.: Corredor 4 · Laticínios" /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Módulo (código do módulo)<input style={{ ...fieldStyle, display: "block", marginTop: 6 }} value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="Ex.: B" /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 16 }}>1. Planograma em CSV<input style={{ ...fieldStyle, display: "block", marginTop: 6, padding: 9 }} type="file" accept=".csv,text/csv" onChange={e => { setPlanogramCsv(e.target.files?.[0] || null); setItems([]); }} /></label>
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>2. Tabela de preços e estoque em CSV (recomendado; estoque opcional)<input style={{ ...fieldStyle, display: "block", marginTop: 6, padding: 9 }} type="file" accept=".csv,text/csv" onChange={e => { setPricesCsv(e.target.files?.[0] || null); setItems([]); }} /></label>
      <InfoBox>O CSV do planograma deve conter: Prateleira, Posição, Código de barras e Nome. A tabela de preços deve conter: Código de barras e Preço. O módulo é informado separadamente nesta tela.</InfoBox>
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}><a href="/modelos/planograma-exemplo.csv" download>Baixar modelo de planograma</a><a href="/modelos/precos-exemplo.csv" download>Baixar modelo de preços e estoque</a></div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {warnings.map(w => <div key={w} style={{ color: "var(--warning-text)", fontSize: 13, marginBottom: 6 }}>⚠ {w}</div>)}
      <button className="btn-outline" style={{ marginTop: 10 }} disabled={reading} onClick={importFiles}>{reading ? "Validando planilhas..." : "Validar planilhas"}</button>
      {items.length > 0 && <div style={{ ...cardStyle, marginTop: 12 }}><strong>{items.length} SKU(s) carregados para o módulo {moduleName}</strong><p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Nenhum indicador será calculado com produtos fora desta lista.</p></div>}
      <div style={{ marginTop: "auto", paddingTop: 18 }}><button className={primaryButton} disabled={!items.length} onClick={continueToCapture}>Continuar para captura</button></div>
    </div>
  );
}

export function GuidedCamera() {
  const [, setLocation] = useLocation();
  const { draft, setDraft } = useAuditDraft();
  const preview = useMemo(() => {
  if (!draft.shelfPhoto) return "";
  return URL.createObjectURL(draft.shelfPhoto);
}, [draft.shelfPhoto]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!draft.planogramItems.length) setLocation("/analyses/new");
  }, [draft.planogramItems.length, setLocation]);
  useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);
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
      {!draft.planogramaId && <label style={{display:"grid",gap:8,marginTop:14}}>Motor de IA<select value={draft.engine||"gemini"} onChange={e=>setDraft(current=>({...current,engine:e.target.value}))}><option value="gemini">Gemini (nuvem)</option><option value="local">IA híbrida local (experimental)</option></select></label>}
      {draft.engine==="local" && !draft.planogramaId && <label style={{display:"grid",gap:8,marginTop:14}}>Fotografia de referência<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f&&(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>12*1024*1024)){setError("Referência inválida: use JPG, PNG ou WEBP até 12 MB.");return;}setError("");setDraft(current=>({...current,referencePhoto:f||null}));}}/>{draft.referencePhoto?.name}</label>}
      <p style={{ fontSize: 12, color: "#CBD5E1", marginTop: 8 }}>No Mac, o seletor permite escolher uma imagem salva no computador. Em celular compatível, pode abrir a câmera.</p>
      {error && <div style={{ color: "#FCA5A5", marginTop: 10 }}>{error}</div>}
      <div style={{ marginTop: "auto", paddingTop: 18, display: "grid", gap: 10 }}>
        <button className={primaryButton} disabled={!draft.shelfPhoto || (draft.engine==="local"&&!draft.planogramaId&&!draft.referencePhoto)} onClick={() => setLocation("/analyses/review")}>Revisar foto</button>
        <button className="btn-outline" onClick={() => setLocation("/analyses/new")}>Voltar</button>
      </div>
    </div>
  );
}

export function ReviewPhoto() {
  const [, setLocation] = useLocation();
  const { draft } = useAuditDraft();
  const photoUrl = useMemo(() => {
  if (!draft.shelfPhoto) return "";
  return URL.createObjectURL(draft.shelfPhoto);
}, [draft.shelfPhoto]);
  useEffect(() => {
  if (!draft.shelfPhoto) setLocation("/analyses/camera");
}, [draft.shelfPhoto, setLocation]);

useEffect(() => {
  return () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  };
}, [photoUrl]);
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
  const {draft}=useAuditDraft();
  return draft.engine==="local" || !draft.shelfPhoto || localStorage.getItem("gondola:v12-job") ? <LocalPreview/> : <GeminiProcess/>;
}
function LocalPreview(){
 const {draft}=useAuditDraft();const [,go]=useLocation();
 const [id,setId]=useState(()=>localStorage.getItem('gondola:v12-job')||''),[job,setJob]=useState(null),[error,setError]=useState(''),[sending,setSending]=useState(false),[now,setNow]=useState(Date.now());
 const report=job?.report;
 const started=useRef(false);
 function selectJob(value){localStorage.setItem('gondola:v12-job',value);setId(value);setJob(null);setError('');}
 useEffect(()=>{if(!id)return;let alive=true;const tick=async()=>{try{const r=await fetch(API_ORIGIN+'/api/auditoria-v12/jobs/'+encodeURIComponent(id));if(!r.ok)throw Error('Não foi possível recuperar a auditoria');const j=await r.json();if(alive){if(j.status==='saved'){localStorage.removeItem('gondola:v12-job');go(`/analyses/${id}/result`);return;}setJob(j);setError('');setNow(Date.now());}}catch(e){if(alive)setError(e.message);}};tick();const timer=setInterval(tick,1500);return()=>{alive=false;clearInterval(timer);};},[id]);
 async function start(){setSending(true);setError('');try{const result=await createLocalPreview(draft);if(result.id)selectJob(result.id);else setJob({status:'done',report:result.report});}catch(e){setError(e.message);}finally{setSending(false);}}
 useEffect(()=>{if(!id&&!started.current&&draft.shelfPhoto&&(draft.planogramaId||draft.referencePhoto)){started.current=true;start();}},[id]);
 const busy=sending||Boolean(id&&!job)||job?.status==='running';
 return <div className="screen-no-nav" style={{display:"flex",flexDirection:"column",gap:16}}><BackHeader title={report?"Auditoria":"Analisando gôndola"}/>
 {error&&<ErrorBox>{error}</ErrorBox>}{job?.error&&<ErrorBox>{job.error}</ErrorBox>}
 {busy&&<div className="audit-progress" role="status"><div className="audit-progress-ring" style={{background:`conic-gradient(var(--primary) ${job?.total>0?100*job.completed/job.total:0}%, #e2e8f0 0)`}}><div><strong>{job?.total>0?`${job.completed}/${job.total}`:'…'}</strong><small>Prateleiras</small></div></div><h2>Análise em andamento</h2><p>{job?.etapa||'Preparando análise'}</p>{job?.startedAt&&<small>Tempo decorrido: {Math.floor(Math.max(0,now-job.startedAt)/60000)}min {String(Math.floor(Math.max(0,now-job.startedAt)/1000)%60).padStart(2,'0')}s</small>}<p>Você pode voltar ao início. A análise continuará normalmente.</p></div>}
 {!busy&&!report&&(error||job?.status==='error')&&<button className={primaryButton} disabled={!draft.shelfPhoto} onClick={start}>Tentar novamente</button>}
 {report&&<LocalResult key={id||"legacy"} report={report} id={id} origin={API_ORIGIN}/>}

 <button className="btn-outline" onClick={()=>go('/dashboard')}>Voltar ao início</button></div>;
}
function GeminiProcess() {
  const [, setLocation] = useLocation();
  const { draft } = useAuditDraft();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!draft.shelfPhoto || !draft.planogramItems.length) { setLocation("/analyses/new"); return; }
    let alive = true;
    const timers = [setTimeout(() => alive && setStep(2), 700), setTimeout(() => alive && setStep(3), 1800)];
    createAudit({
      shelfPhoto: draft.shelfPhoto,
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
  return <div className="screen-no-nav" style={{display:'flex',flexDirection:'column',gap:16}}><BackHeader title="Auditoria concluída"/><LocalResult key={id} report={audit} id={id} origin={API_ORIGIN} completed={audit}/><button className="btn-outline" onClick={()=>setLocation('/dashboard')}>Voltar ao início</button></div>;
}
export function OccurrencesList(){
 const {id}=useParams();const [,go]=useLocation();const {audit,error,loading}=useAudit(id);const [filter,setFilter]=useState('Todas');
 if(loading)return <p>Carregando…</p>;if(error)return <ErrorBox>{error}</ErrorBox>;
 const items=audit.indicators.occurrences;
 return <div className="screen-no-nav"><BackHeader title="Ocorrências" back={`/analyses/${id}/result`}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{['Todas','Ruptura','Preço','Posição'].map(t=><button key={t} className={filter===t?'btn-primary':'btn-outline'} onClick={()=>setFilter(t)}>{t} {items.filter(i=>t==='Todas'||i.type===t).length}</button>)}</div><div className="lr">{items.filter(i=>filter==='Todas'||i.type===filter).map(i=><div className="lr-panel" key={i.occurrenceKey}><strong>{i.name}</strong><p>{i.type} · SKU {i.sku}</p><p>{i.type==='Ruptura'?(i.stockQuantity??i.stock)==null?'Conferir estoque':(i.stockQuantity??i.stock)>0?'Repor produto':'Solicitar compra':i.type==='Preço'?'Conferir etiqueta':'Ajustar posição'}</p>{i.type==='Preço'&&<p>Sistema {formatPrice(i.expectedPrice??i.systemPrice)} · Gôndola {formatPrice(i.priceRead)}</p>}{i.type==='Ruptura'&&<p>Estoque: {i.stockQuantity??i.stock??'Desconhecido'}</p>}</div>)}</div><button className="btn-outline" onClick={()=>go(`/analyses/${id}/result`)}>Voltar</button></div>;
}
export function OccurrenceDetail(){return <OccurrencesList/>;}
export function AnalysisSuccess(){return <AnalysisResult/>;}

export function History() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState(7);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { getAudits().then(setAudits).catch(e => setError(e.message)); }, []);
  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => audits.filter(a => now - new Date(a.createdAt).getTime() <= period * 86400000), [audits, period, now]);
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
