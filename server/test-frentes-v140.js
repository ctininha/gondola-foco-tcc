import assert from 'node:assert/strict';
import {confirmItems} from './conferencia-v13.js';
import {readAudit,summarize} from '../gestao/audit-read.js';
const items=Array.from({length:19},(_,n)=>({sku:String(n),name:'Produto '+n,candidateState:n<6?'A':'P',systemPrice:10,stock:n<6?[100,77,500,0,0,null][n]:0,frentesPrevistas:n===6?4:2}));
const rows=items.map((i,n)=>({sku:i.sku,state:i.candidateState,priceRead:n<6?null:n===8?9.5:10,quantidadeVisivel:n<6?0:null,frentesConfirmadas:n===6?3:n===7?1:null}));
const result={...confirmItems({items},rows,true),planograma:{id:'test'}};
assert.equal(result.indicators.IGE,76);assert.equal(result.indicators.occurrences.length,9);assert.equal(result.indicators.frontsEvaluated,8);assert.equal(result.indicators.ICF,null);
const a=readAudit({result_json:JSON.stringify(result),id:'test',corridor:'a',module_name:'b'});assert.equal(summarize([a]).occurrences.length,9);assert.equal(summarize([a]).ICF,result.indicators.ICF);
const legacy=confirmItems({items:items.map(({frentesPrevistas: _frentesPrevistas,...i})=>i)},rows.map(({frentesConfirmadas: _frentesConfirmadas,...r})=>r),true);assert.equal(legacy.indicators.ICF,null);assert.equal(legacy.indicators.occurrences.length,7);
assert.throws(()=>confirmItems({items},rows.map((r,n)=>n===6?{...r,frentesConfirmadas:0}:r),true));
console.log('Frentes, integração e compatibilidade aprovadas (cenário sintético).');

const full=confirmItems({items},rows.map((r,n)=>({...r,frentesConfirmadas:r.frentesConfirmadas??(n<6?0:2)})),true);assert.equal(full.indicators.frontsEvaluated,19);assert.equal(full.indicators.ICF,100*26/40);assert.equal(summarize([{...a,planograma:null},a]).currentModules,1);
