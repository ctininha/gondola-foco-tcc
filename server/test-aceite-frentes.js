import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  sugerirFrentes,
  indicadoresSugeridos,
  pendenciaFrentes
} from './frentes-revisao.js';

import {confirmItems} from './conferencia-v13.js';
import {readAudit,summarize} from '../gestao/audit-read.js';

const [normalPath, doubtPath] = process.argv.slice(2);

assert.ok(
  normalPath && doubtPath,
  'Informe os caminhos dos dois relatorios de aceite.'
);

const load = file =>
  JSON.parse(readFileSync(file,'utf8'));

const makeRows = report => report.items.map(i => ({
  sku:i.sku,
  state:i.candidateState,
  priceRead:i.priceRead??null,
  quantidadeVisivel:i.candidateState==='A'?0:null,
  frentesConfirmadas:null
}));

const normal = load(normalPath);
const rows = makeRows(normal);

assert.equal(normal.items.length,19);

const suggested = sugerirFrentes(normal.items,rows);

assert.equal(
  normal.items.filter(i =>
    pendenciaFrentes(
      i,suggested.find(r=>r.sku===i.sku)
    )
  ).length,
  0
);

const result = confirmItems(normal,suggested,true);
const ind = result.indicators;

assert.equal(ind.IGE,76);
assert.equal(ind.frontsEvaluated,19);
assert.equal(ind.frontsExpected,48);
assert.equal(ind.frontsMet,31);
assert.equal(ind.occurrences.length,10);

assert.equal(
  ind.occurrences.filter(
    o=>o.type==='Exposição parcial'
  ).length,
  3
);

const preview = indicadoresSugeridos(normal.items,rows);

assert.equal(preview.IGE,76);
assert.equal(preview.frontsMet,31);
assert.equal(preview.frontsEvaluated,19);

const audit = readAudit({
  id:'test',
  corridor:'a',
  module_name:'b',
  result_json:JSON.stringify({
    ...result,
    planograma:normal.planograma
  })
});

assert.equal(
  summarize([audit]).occurrences.length,
  10
);

console.log(
  'Relatorio normal: indicadores, frentes e Gestao aprovados.'
);

const doubt = load(doubtPath);
const doubtRows = makeRows(doubt);
const doubtSuggested = sugerirFrentes(
  doubt.items,doubtRows
);

const philadelphia = doubt.items.find(
  i=>i.name==='Cream cheese Philadelphia 150g'
);

const cream = doubt.items.find(
  i=>i.name==='Cream cheese 150g'
);

assert.ok(philadelphia);
assert.ok(cream);

for(const item of [philadelphia,cream]){
  const row = doubtSuggested.find(
    r=>r.sku===item.sku
  );

  assert.equal(row.frentesConfirmadas,null);
  assert.equal(pendenciaFrentes(item,row),true);
}

assert.throws(
  ()=>confirmItems(doubt,doubtSuggested,true),
  /Confira as frentes/
);

const edited = doubtRows.map(r=>{
  if(r.sku===philadelphia.sku){
    return {
      ...r,
      frentesConfirmadas:2,
      frentesEditadas:true,
      confirmed:true
    };
  }

  if(r.sku===cream.sku){
    return {
      ...r,
      frentesConfirmadas:1,
      frentesEditadas:true,
      confirmed:true
    };
  }

  return r;
});

const corrected = sugerirFrentes(
  doubt.items,edited
);

for(const item of [philadelphia,cream]){
  assert.equal(
    pendenciaFrentes(
      item,corrected.find(r=>r.sku===item.sku)
    ),
    false
  );
}

const correctedPreview = indicadoresSugeridos(
  doubt.items,corrected
);

assert.equal(
  corrected.find(r=>r.sku===cream.sku)
    .frentesConfirmadas,
  1
);

assert.equal(
  corrected.find(r=>r.sku===philadelphia.sku)
    .frentesConfirmadas,
  2
);

const unknown = rows.map(r=>
  r.sku===cream.sku
    ? {...r,frentesEditadas:true}
    : r
);

const unknownPreview = indicadoresSugeridos(
  normal.items,unknown
);

assert.equal(unknownPreview.frontsEvaluated,18);
assert.equal(unknownPreview.ICF,null);

assert.ok(
  correctedPreview.frontsEvaluated >
  indicadoresSugeridos(
    doubt.items,doubtRows
  ).frontsEvaluated
);

console.log(
  'Duvidas: bloqueio automatico e conferencia humana aprovados.'
);

console.log(
  'Contagem desconhecida: tratamento aprovado.'
);

console.log('ACEITE V1.4.0 APROVADO');
