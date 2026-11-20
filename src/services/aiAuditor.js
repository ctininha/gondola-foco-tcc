// A análise de IA acontece exclusivamente no servidor para proteger GEMINI_API_KEY.
// Este arquivo mantém compatibilidade com imports antigos sem executar IA no navegador.
export async function analisarGondolaComIA() {
  throw new Error("Use createAudit em src/services/auditApi.js. A análise deve passar pelo servidor.");
}
