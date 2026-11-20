const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, options);
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se a API está iniciada.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}

export async function createAudit({ shelfPhoto, planogramPhoto, planogramItems, corridor, moduleName, planogramName }) {
  const body = new FormData();
  body.append("shelfPhoto", shelfPhoto);
  body.append("planogramPhoto", planogramPhoto);
  body.append("planogramItems", JSON.stringify(planogramItems));
  body.append("corridor", corridor);
  body.append("module", moduleName);
  body.append("planogramName", planogramName || "");
  return request("/api/audits", { method: "POST", body });
}

export async function getAudits() {
  return request("/api/audits");
}

export async function getAudit(id) {
  return request(`/api/audits/${encodeURIComponent(id)}`);
}

export async function updateOccurrence(auditId, occurrenceKey, status, note = "") {
  return request(`/api/audits/${encodeURIComponent(auditId)}/occurrences/${encodeURIComponent(occurrenceKey)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
}

export async function getHealth() {
  return request("/api/health");
}
