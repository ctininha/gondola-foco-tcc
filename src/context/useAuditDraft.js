import { useContext } from "react";
import { AuditContext } from "./AuditContext.js";

export function useAuditDraft() {
  const context = useContext(AuditContext);

  if (!context) {
    throw new Error("useAuditDraft precisa estar dentro de AuditProvider.");
  }

  return context;
}
