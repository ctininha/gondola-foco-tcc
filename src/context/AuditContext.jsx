import { createContext, useContext, useMemo, useState } from "react";

const AuditContext = createContext(null);

export function AuditProvider({ children }) {
  const [draft, setDraft] = useState({
    corridor: "",
    moduleName: "",
    planogramName: "",
    planogramItems: [],
    planogramFile: null,
    shelfPhoto: null,
  });

  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAuditDraft() {
  const context = useContext(AuditContext);
  if (!context) throw new Error("useAuditDraft precisa estar dentro de AuditProvider.");
  return context;
}
