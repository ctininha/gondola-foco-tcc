
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function optimizeImage(file) {
  if (!file || !file.type?.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

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

export async function createAudit({
  shelfPhoto,
  planogramItems,
  corridor,
  moduleName,
  planogramName,
}) {
  const optimizedShelf = await optimizeImage(shelfPhoto);

  const body = new FormData();
  body.append("shelfPhoto", optimizedShelf);
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
