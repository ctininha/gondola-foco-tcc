import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { HISTORICO_SEMANA, USER_DATA } from "../data/mockData";
import { BottomNav } from "../components/SharedUI";

// T07 · Resultado
export function AnalysisResult() {
  const [, setLocation] = useLocation();

  return (
    <div className="screen-no-nav">
      <div className="top-bar">
        <button className="back-btn" onClick={() => setLocation("/")}>‹</button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700" }}>Resultado</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Corredor 4 · Módulo B</p>
        </div>
      </div>

      {/* Anel IGE */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "12px 0 20px" }}>
        <div style={{
          width: "160px", height: "160px", borderRadius: "50%",
          border: "14px solid var(--success)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: "48px", fontWeight: "800", lineHeight: 1 }}>94</span>
          <span style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>de 100</span>
        </div>

        <div style={{ fontWeight: "700", fontSize: "16px", marginTop: "14px", marginBottom: "6px" }}>
          Índice geral de execução
        </div>
        <span className="badge badge-success" style={{ fontSize: "14px", padding: "4px 16px" }}>Bom</span>
      </div>

      {/* Três cartões de indicadores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <div style={{ background: "var(--success-bg)", padding: "14px 8px", borderRadius: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--success-text)", fontWeight: "600" }}>Ruptura</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--success-text)", marginTop: "4px" }}>4%</div>
        </div>
        <div style={{ background: "var(--success-bg)", padding: "14px 8px", borderRadius: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--success-text)", fontWeight: "600" }}>Planograma</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--success-text)", marginTop: "4px" }}>92%</div>
        </div>
        <div style={{ background: "var(--warning-bg)", padding: "14px 8px", borderRadius: "14px", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--warning-text)", fontWeight: "600" }}>Preço</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--warning-text)", marginTop: "4px" }}>1 item</div>
        </div>
      </div>

      {/* Resumo das ocorrências */}
      <div style={{ background: "#F1F5F9", padding: "16px", borderRadius: "14px", marginBottom: "24px" }}>
        <div style={{ fontWeight: "700", fontSize: "16px" }}>3 ocorrências para tratar</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 8px" }}>
          1 ruptura · 1 fora de posição · 1 preço divergente
        </div>
        <div style={{ fontSize: "13px", color: "#475569" }}>
          Corrigir agora melhora a nota da gôndola.
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <button className="btn-primary" onClick={() => setLocation("/analyses/4/occurrences")}>
          Ver ocorrências
        </button>
        <button
          onClick={() => setLocation("/analyses/camera")}
          style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
        >
          Refazer a foto
        </button>
      </div>
    </div>
  );
}

// T08 · Ocorrências
export function OccurrencesList({ ocorrencias, setOcorrencias }) {
  const [, setLocation] = useLocation();
  const [filtro, setFiltro] = useState("Todas");

  // Ordenação padrão da especificação: Ruptura -> Preço -> Posição
  const pesoTipo = { "Ruptura": 1, "Preço": 2, "Posição": 3 };
  const ativas = ocorrencias.filter((o) => o.status !== "Incorreto");
  const ordenadas = [...ativas].sort((a, b) => pesoTipo[a.tipo] - pesoTipo[b.tipo]);

  const filtradas = filtro === "Todas" ? ordenadas : ordenadas.filter((o) => o.tipo === filtro);
  const resolvidasCount = ativas.filter((o) => o.status === "Resolvida" || o.status === "Justificada").length;
  const todasTratadas = ativas.length > 0 && resolvidasCount === ativas.length;

  const resolverTodasRapido = () => {
    setOcorrencias(ocorrencias.map(o => ({ ...o, status: "Resolvida" })));
  };

  return (
    <div className="screen-no-nav">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="back-btn" onClick={() => setLocation("/analyses/4/result")}>‹</button>
          <h1 style={{ fontSize: "20px", fontWeight: "700" }}>Ocorrências</h1>
        </div>
        {!todasTratadas && (
          <button
            onClick={resolverTodasRapido}
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            Marcar todas
          </button>
        )}
      </div>

      {/* Filtros por tipo */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "14px" }}>
        {["Todas", "Ruptura", "Posição", "Preço"].map((tab) => {
          const count = tab === "Todas" ? ativas.length : ativas.filter((o) => o.tipo === tab).length;
          const active = filtro === tab;
          return (
            <button
              key={tab}
              onClick={() => setFiltro(tab)}
              style={{
                padding: "7px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: "600",
                border: active ? "none" : "1px solid var(--border)",
                background: active ? "var(--primary)" : "white",
                color: active ? "white" : "var(--text-main)",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
            >
              {tab} {count}
            </button>
          );
        })}
      </div>

      {/* Lista de cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        {filtradas.map((item) => (
          <div
            key={item.id}
            onClick={() => setLocation(`/analyses/occurrences/${item.id}`)}
            style={{
              border: "1px solid var(--border)", borderRadius: "16px", padding: "14px",
              display: "flex", gap: "12px", cursor: "pointer", background: "white"
            }}
          >
            <div style={{
              width: "64px", height: "64px", borderRadius: "12px", background: "#F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0
            }}>
              {item.tipo === "Ruptura" ? "❓" : item.tipo === "Posição" ? "⇄" : "🏷️"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>{item.produto}</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
                {item.resumo} · {item.localizacao}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${
                  item.tipo === "Ruptura" ? "badge-danger" : item.tipo === "Posição" ? "badge-warning" : "badge-purple"
                }`}>
                  {item.tipo}
                </span>
                <span style={{
                  fontSize: "13px", fontWeight: "600",
                  color: item.status === "Pendente" ? "var(--text-muted)" : "var(--success)"
                }}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "12px" }}>
          {resolvidasCount} de {ativas.length} resolvidas
        </div>
        <button
          className="btn-primary"
          disabled={!todasTratadas}
          onClick={() => setLocation("/analyses/4/success")}
        >
          Concluir tratativa
        </button>
      </div>
    </div>
  );
}

// T09 · Detalhe da ocorrência
export function OccurrenceDetail({ ocorrencias, setOcorrencias }) {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [mostrarJustificativa, setMostrarJustificativa] = useState(false);

  const item = ocorrencias.find((o) => String(o.id) === String(params.occurrenceId)) || ocorrencias[2];

  const atualizarStatus = (novoStatus) => {
    setOcorrencias(ocorrencias.map((o) => (o.id === item.id ? { ...o, status: novoStatus } : o)));
    setLocation("/analyses/4/occurrences");
  };

  return (
    <div className="screen-no-nav">
      <div className="top-bar">
        <button className="back-btn" onClick={() => setLocation("/analyses/4/occurrences")}>‹</button>
        <h1 style={{ fontSize: "20px", fontWeight: "700" }}>
          {item.tipo === "Preço" ? "Preço divergente" : item.tipo === "Ruptura" ? "Produto ausente" : "Fora de posição"}
        </h1>
      </div>

      {/* Evidência recortada simulada */}
      <div style={{
        background: "#334155", borderRadius: "16px", padding: "18px", marginBottom: "16px",
        display: "flex", flexDirection: "column", alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginBottom: "10px" }}>
          <div style={{ width: "36px", height: "64px", background: "#F59E0B", borderRadius: "6px" }} />
          <div style={{ width: "36px", height: "64px", background: "#3B82F6", borderRadius: "6px" }} />
          <div style={{ width: "36px", height: "64px", background: "#EC4899", borderRadius: "6px" }} />
          <div style={{ width: "36px", height: "64px", background: "#10B981", borderRadius: "6px" }} />
        </div>
        {item.tipo === "Preço" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ background: "#DC2626", color: "white", fontSize: "11px", fontWeight: "700", padding: "2px 10px", borderRadius: "99px", marginBottom: "4px" }}>
              Etiqueta lida
            </span>
            <div style={{ background: "white", padding: "6px 18px", borderRadius: "8px", fontWeight: "800", border: "2px dashed #DC2626" }}>
              {item.precoEtiqueta}
            </div>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: "20px", fontWeight: "800" }}>{item.produto}</h2>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 16px" }}>
        {item.localizacao} · SKU {item.sku}
      </p>

      {/* Box Comparativo */}
      <div style={{ background: "#F1F5F9", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
        {item.tipo === "Preço" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center" }}>
            <div style={{ borderRight: "1px solid #CBD5E1" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Na etiqueta (foto)</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--danger)", marginTop: "4px" }}>{item.precoEtiqueta}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No sistema</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--success)", marginTop: "4px" }}>{item.precoSistema}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div><strong>Esperado:</strong> {item.esperado}</div>
            <div><strong>Encontrado:</strong> {item.encontrado}</div>
          </div>
        )}
        <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "12px" }}>
          Confiança da leitura: {item.confianca}
        </div>
      </div>

      <p style={{ fontSize: "14px", color: "#475569", marginBottom: "20px" }}>{item.instrucao}</p>

      {mostrarJustificativa ? (
        <div style={{ background: "#F8FAFC", border: "1px solid var(--border)", padding: "14px", borderRadius: "14px", marginBottom: "16px" }}>
          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "10px" }}>Selecione o motivo:</div>
          {["Sem estoque no depósito", "Produto descontinuado", "Etiqueta indisponível", "Outro"].map((motivo) => (
            <button
              key={motivo}
              onClick={() => atualizarStatus("Justificada")}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                marginBottom: "6px", borderRadius: "8px", border: "1px solid var(--border)",
                background: "white", fontSize: "14px", cursor: "pointer"
              }}
            >
              {motivo}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="btn-primary" onClick={() => atualizarStatus("Resolvida")}>
            Marcar como resolvido
          </button>
          <button className="btn-outline" onClick={() => setMostrarJustificativa(true)}>
            Não consegui resolver
          </button>
          <button
            onClick={() => {
              alert("Alerta enviado para revisão do gerente e removido da sua lista.");
              atualizarStatus("Incorreto");
            }}
            style={{
              background: "none", border: "none", color: "var(--text-muted)", fontSize: "14px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "6px", cursor: "pointer"
            }}
          >
            <span>🚩</span> Este alerta está incorreto
          </button>
        </div>
      )}
    </div>
  );
}

// T10 · Conclusão
export function AnalysisSuccess() {
  const [, setLocation] = useLocation();

  return (
    <div className="screen-no-nav" style={{ textAlign: "center", paddingTop: "48px" }}>
      <div style={{
        width: "84px", height: "84px", borderRadius: "50%", background: "var(--success-bg)",
        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%", background: "var(--success)",
          color: "white", fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          ✓
        </div>
      </div>

      <h1 style={{ fontSize: "26px", fontWeight: "800" }}>Corredor 4 concluído</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "4px", marginBottom: "28px" }}>
        Módulo B · 3 de 3 ocorrências resolvidas
      </p>

      {/* Resumo de métricas */}
      <div style={{
        background: "#F1F5F9", borderRadius: "16px", padding: "20px 12px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "24px"
      }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800" }}>94</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>nota atual</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800" }}>3</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>resolvidas</div>
        </div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "800" }}>12 min</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>de trabalho</div>
        </div>
      </div>

      <p style={{ fontSize: "14px", color: "#475569", padding: "0 16px", marginBottom: "32px" }}>
        Quer confirmar as correções? Uma nova foto atualiza a nota da gôndola.
      </p>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        <button className="btn-primary" onClick={() => setLocation("/analyses/camera")}>
          <span>📷</span> Fotografar para confirmar
        </button>
        <button className="btn-outline" onClick={() => setLocation("/")}>
          Voltar ao início
        </button>
      </div>
    </div>
  );
}

// T11 · Histórico
export function History() {
  const [, setLocation] = useLocation();
  const [periodo, setPeriodo] = useState("Últimos 7 dias");

  return (
    <div className="screen">
      <h1 style={{ fontSize: "26px", fontWeight: "800", marginBottom: "16px" }}>Histórico</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["Últimos 7 dias", "Todos os corredores"].map((f) => (
          <button
            key={f}
            onClick={() => setPeriodo(f)}
            style={{
              padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: "600",
              background: periodo === f ? "var(--primary)" : "white",
              color: periodo === f ? "white" : "var(--text-main)",
              border: periodo === f ? "none" : "1px solid var(--border)", cursor: "pointer"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cartão Nota Média com minigráfico */}
      <div style={{ background: "#F1F5F9", borderRadius: "18px", padding: "18px", marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "600" }}>Nota média da semana</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontSize: "38px", fontWeight: "800", lineHeight: 1 }}>93</span>

          <svg width="210" height="65" viewBox="0 0 210 65">
            <polyline
              fill="none"
              stroke="#1366E5"
              strokeWidth="2.5"
              points="15,45 45,40 75,30 105,35 135,20 165,14 195,24"
            />
            {HISTORICO_SEMANA.map((d, i) => {
              const cx = 15 + i * 30;
              const cy = [45, 40, 30, 35, 20, 14, 24][i];
              return (
                <g key={d.dia}>
                  <circle cx={cx} cy={cy} r="4" fill="white" stroke="#1366E5" strokeWidth="2.5" />
                  <text x={cx} y="62" textAnchor="middle" fontSize="9" fill="#64748B">{d.dia}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Lista agrupada por dia */}
      <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px" }}>HOJE</div>
      <div onClick={() => setLocation("/analyses/4/result")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
        <div>
          <div style={{ fontWeight: "700" }}>Corredor 4 · Módulo B</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>14:32 · 3 ocorrências</div>
        </div>
        <span className="badge badge-success" style={{ fontSize: "14px" }}>94</span>
      </div>

      <div onClick={() => setLocation("/analyses/3/result")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", marginBottom: "18px", cursor: "pointer" }}>
        <div>
          <div style={{ fontWeight: "700" }}>Corredor 3 · Limpeza</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>10:41 · 2 ocorrências</div>
        </div>
        <span className="badge badge-success" style={{ fontSize: "14px" }}>91</span>
      </div>

      <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px" }}>ONTEM</div>
      <div onClick={() => setLocation("/analyses/2/result")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
        <div>
          <div style={{ fontWeight: "700" }}>Corredor 2 · Bebidas</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>16:40 · sem ocorrências</div>
        </div>
        <span className="badge badge-success" style={{ fontSize: "14px" }}>100</span>
      </div>

      <BottomNav active="historico" />
    </div>
  );
}

// T12 · Perfil
export function Profile() {
  const [, setLocation] = useLocation();
  const [salvarGaleria, setSalvarGaleria] = useState(false);

  return (
    <div className="screen">
      <h1 style={{ fontSize: "26px", fontWeight: "800", marginBottom: "24px" }}>Perfil</h1>

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{
          width: "76px", height: "76px", borderRadius: "50%", background: "var(--primary-light)",
          color: "var(--primary)", fontSize: "30px", fontWeight: "800",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px"
        }}>
          {USER_DATA.iniciais}
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "800" }}>{USER_DATA.nome} · {USER_DATA.cargo}</h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>
          {USER_DATA.loja} · {USER_DATA.turno}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "15px", fontWeight: "500" }}>Fila de envio</span>
          <span className="badge badge-success">0 pendentes</span>
        </div>

        <div
          onClick={() => alert("Dicas: Mantenha a gôndola inteira no quadro, use o flash em corredores escuros e evite capturar clientes.")}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
        >
          <span style={{ fontSize: "15px", fontWeight: "500" }}>Dicas para fotografar</span>
          <span style={{ color: "var(--text-muted)", fontSize: "18px" }}>›</span>
        </div>

        <div
          onClick={() => alert("LGPD: As fotos são armazenadas de forma protegida pelo prazo de 90 dias e não ficam na galeria pessoal.")}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
        >
          <span style={{ fontSize: "15px", fontWeight: "500" }}>Privacidade e fotos (LGPD)</span>
          <span style={{ color: "var(--text-muted)", fontSize: "18px" }}>›</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "15px", fontWeight: "500" }}>Salvar fotos na galeria</span>
          <input
            type="checkbox"
            checked={salvarGaleria}
            onChange={(e) => setSalvarGaleria(e.target.checked)}
            style={{ width: "22px", height: "22px", accentColor: "var(--primary)" }}
          />
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>
        Versão 1.0 · dados de exemplo
      </p>

      <div style={{ marginTop: "auto" }}>
        <button className="btn-danger-outline" onClick={() => setLocation("/login")}>
          Sair
        </button>
      </div>

      <BottomNav active="perfil" />
    </div>
  );
}
