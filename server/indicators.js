export function calculateIndicators(items) {
  const expected = items.length;
  const evaluable = items.filter(item => ["P", "F", "A"].includes(item.state));
  const V = evaluable.length;
  const A = evaluable.filter(item => item.state === "A").length;
  const P = evaluable.filter(item => item.state === "P").length;

  // Q inclui preços legíveis iguais e divergentes; ambos são avaliáveis.
  const priceEvaluable = items.filter(item =>
    ["P", "F"].includes(item.state) && ["EVALUABLE", "DIVERGENT"].includes(item.priceStatus)
  );
  const Q = priceEvaluable.length;
  const D = priceEvaluable.filter(item => item.priceStatus === "DIVERGENT").length;

  const IR = V > 0 ? (A / V) * 100 : null;
  const ICP = V > 0 ? (P / V) * 100 : null;
  const IDP = Q > 0 ? (D / Q) * 100 : null;
  const components = [
    IR == null ? null : 100 - IR,
    ICP,
    IDP == null ? null : 100 - IDP,
  ].filter(value => value != null);
  const IGE = components.length
    ? Math.round(components.reduce((sum, value) => sum + value, 0) / components.length)
    : null;

  const indeterminate = items.filter(item => item.state === "I").length;
  const occurrences = [];
  for (const item of items) {
    const add = (type, status = "Pendente") => occurrences.push({
      ...item, type, status, occurrenceKey: `${item.sku}::${type}`,
    });
    if (item.state === "A") add("Ruptura");
    if (item.state === "F") add("Posição");
    if (["P", "F"].includes(item.state) && item.priceStatus === "DIVERGENT") add("Preço");
  }

  const classification = IGE == null
    ? "Não calculável"
    : IGE >= 97 ? "Excelente"
      : IGE >= 90 ? "Bom"
        : IGE >= 80 ? "Atenção" : "Crítico";

  return {
    expected, V, A, P, Q, D, IR, ICP, IDP, IGE, classification,
    indeterminate,
    positionCount: items.filter(item => item.state === "F").length,
    needsNewPhoto: expected > 0 && (indeterminate / expected) > 0.20,
    occurrences,
  };
}
