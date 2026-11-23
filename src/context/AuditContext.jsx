import { useMemo, useState } from "react";
import { AuditContext } from "./AuditContext.js";

export function AuditProvider({ children }) {
  const [draft, setDraft] = useState({
    corridor: "",
    moduleName: "",
    planogramName: "",
    planogramItems: [],
    shelfPhoto: null,
  });

  const value = useMemo(() => ({ draft, setDraft }), [draft]);

  return (
    <AuditContext.Provider value={value}>
      {children}
    </AuditContext.Provider>
  );
}
