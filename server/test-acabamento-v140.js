import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LeitorPlanograma} from '../motor-local/gondola-foco-prototipo-v045/src/LeitorPlanograma.js';
import {confirmItems} from './conferencia-v13.js';
import {readAudit,summarize} from '../gestao/audit-read.js';
import {validarConferencia} from './referencia-v12.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'gf-test-'));
try{
const plan=path.join(dir,'plan.csv'),prices=path.join(dir,'prices.csv');
await fs.writeFile(plan,'Prateleira;Posição;Código de barras;Nome\n1;1;7891000000073;Cream cheese\n1;2;7891000000059;Philadelphia\n');
const csv='Código de barras;Preço;Quantidade estoque\n';
await fs.writeFile(prices,csv+'7891000000073;10,90;\n7891000000059;;0\n');
const items=await new LeitorPlanograma().ler(plan,prices);
assert.equal(items[0].stock,0);assert.equal(items[0].stockSource,'ASSUMED_ZERO');assert.equal(items[1].systemPrice,null);assert.equal(items[1].stockSource,'CSV');
for(const invalid of ['-1','1.5','999999999999999999999']){await fs.writeFile(prices,csv+`7891000000073;10,90;${invalid}\n`);await assert.rejects(()=>new LeitorPlanograma().ler(plan,prices));}
const entries=items.map(i=>({sku:i.sku,colunas:2,unidades:4,confirmado:true}));assert.throws(()=>validarConferencia(items,[{...entries[0],confirmado:false},entries[1]]));assert.equal(validarConferencia(items,entries)[0].colunas,2);
const report={items:items.map(i=>({...i,candidateState:'P',frentesPrevistas:2,frentesCandidatas:1}))};
const rows=items.map(i=>({sku:i.sku,state:'P',priceRead:10.9,quantidadeVisivel:null,frentesConfirmadas:1}));
const run=()=>{const result={...confirmItems(report,rows,true),planograma:{id:'test'}};return summarize([readAudit({result_json:JSON.stringify(result),id:'test',corridor:'a',module_name:'b'})]);};
const before=run();assert.equal(before.stockActions.purchaseReview,2);assert.equal(before.totals.Q,1);report.items[0].stock=15;const after=run();assert.equal(after.stockActions.replenishment,1);assert.equal(after.stockActions.purchaseReview,1);assert.equal(before.IGE,after.IGE);assert.equal(before.ICF,after.ICF);assert.equal(before.occurrences.length,after.occurrences.length);
console.log('Acabamento: CSV, estoque assumido, preço vazio, validação e mudança de orientação aprovados.');
}finally{await fs.rm(dir,{recursive:true,force:true});}
