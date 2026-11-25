import assert from 'node:assert/strict';
import fs from 'node:fs';
import {confirmItems} from './conferencia-v13.js';
import {readAudit,summarize} from '../gestao/audit-read.js';
const fixture = {
  planograma: {id:'teste-integracao',version:1},
  items: Array.from({length:19}, (_,n) => {
    const absent = n < 6;
    return {
      sku: String(1000+n),
      name: 'Produto de teste '+(n+1),
      shelf: Math.floor(n/5)+1,
      position: n%5+1,
      candidateState: absent?'A':'P',
      systemPrice: 10,
      priceRead: absent?null:n===6?9.50:10,
      stock: absent?[100,77,500,0,0,null][n]:0
    };
  })
};

const report = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
  : fixture;
const rows=report.items.map(i=>({sku:i.sku,state:i.candidateState,priceRead:i.priceRead??null,quantidadeVisivel:i.candidateState==='A'?0:null}));
const result={...confirmItems(report,rows,true),planograma:report.planograma};
for(const old of [false,true]){const r=structuredClone(result);if(old)for(const i of r.items)delete i.stockQuantity;const a=readAudit({result_json:JSON.stringify(r),id:'test',created_at:'2026-11-25',corridor:'Loja 01',module_name:'Refrigerador 01'});const m=summarize([a]);assert.equal(m.IGE,76);assert.equal(m.totals.Q,13);assert.equal(m.totals.D,1);assert.equal(m.totals.A,6);assert.equal(m.occurrences.length,7);assert.deepEqual(m.stockActions,{replenishment:3,purchaseReview:2,verifyStock:1});}
console.log('Integração aprovada: '+(process.argv[2]?'relatório real':'cenário sintético')+'; formato novo e legado V1.3.1.');
