import assert from "node:assert/strict";
import { calculateIndicators } from "./indicators.js";

const example = Array.from({ length: 24 }, (_, index) => ({
  sku: String(7891000000000 + index),
  state: index === 0 ? "A" : index === 1 ? "F" : "P",
  priceStatus: index < 22 ? (index === 2 ? "DIVERGENT" : "EVALUABLE") : "NOT_APPLICABLE",
}));
const result = calculateIndicators(example);

assert.equal(result.expected, 24);
assert.equal(result.V, 24);
assert.equal(result.A, 1);
assert.equal(result.P, 22);
assert.equal(result.Q, 22);
assert.equal(result.D, 1);
assert.ok(Math.abs(result.IR - 4.1666667) < 0.0001);
assert.ok(Math.abs(result.ICP - 91.6666667) < 0.0001);
assert.ok(Math.abs(result.IDP - 4.5454545) < 0.0001);
assert.equal(result.IGE, 94);
assert.equal(result.classification, "Bom");
assert.equal(result.occurrences.length, 3);

const noPrices = calculateIndicators([
  { sku: "11111111", state: "A", priceStatus: "NOT_APPLICABLE" },
  { sku: "22222222", state: "P", priceStatus: "NOT_APPLICABLE" },
]);
assert.equal(noPrices.IDP, null);
assert.equal(noPrices.IGE, 50);

const noEvaluableItems = calculateIndicators([
  { sku: "33333333", state: "I", priceStatus: "EVALUABLE" },
]);
assert.equal(noEvaluableItems.IR, null);
assert.equal(noEvaluableItems.ICP, null);
assert.equal(noEvaluableItems.IGE, 100);

const noData = calculateIndicators([
  { sku: "44444444", state: "I", priceStatus: "NOT_APPLICABLE" },
]);
assert.equal(noData.IGE, null);
assert.equal(noData.classification, "Não calculável");

console.log("Indicadores aprovados: exemplo da Seção 6 e casos sem dados.");
