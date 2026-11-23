import { useLocation } from "wouter";
import { PLANOGRAMA_EXEMPLO } from "../data/mockData";


export function BottomNav({ active }) {
  const [, setLocation] = useLocation();

  const items = [
    {
      id: "inicio",
      label: "Início",
      path: "/dashboard",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9" />
          <path d="M9 20v-7h6v7" />
        </svg>
      ),
    },
    {
      id: "historico",
      label: "Histórico",
      path: "/history",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
          <path d="M3 4v5h5" />
        </svg>
      ),
    },
    {
      id: "perfil",
      label: "Perfil",
      path: "/profile",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-current={active === item.id ? "page" : undefined}
          className={`nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => setLocation(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}


export function PlanogramaVisual({ height = 160 }) {
  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: "12px",
      padding: "12px",
      border: "1px solid #E2E8F0",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      height: `${height}px`
    }}>
      {PLANOGRAMA_EXEMPLO.prateleiras.map((prateleira, idx) => (
        <div key={idx} style={{ borderBottom: "4px solid #CBD5E1", paddingBottom: "2px", display: "flex", gap: "4px", alignItems: "flex-end" }}>
          {prateleira.map((item, i) => (
            <div
              key={i}
              style={{
                backgroundColor: item.cor,
                width: `${item.w}px`,
                height: idx === 0 ? "36px" : "30px",
                borderRadius: "4px 4px 1px 1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div style={{ width: "65%", height: "10px", background: "rgba(255,255,255,0.85)", borderRadius: "2px" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
