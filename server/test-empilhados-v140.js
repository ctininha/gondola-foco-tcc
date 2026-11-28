import assert from 'node:assert/strict';
import {duvidaFrentes,sugerirFrentes,pendenciaFrentes} from './frentes-revisao.js';
import {confirmItems} from './conferencia-v13.js';
const i={sku:'teste',name:'Produto empilhado',candidateState:'P',systemPrice:10,stock:0,frentesPrevistas:2,frentesCandidatas:2,reference:{unidades:4},observed:{unidades:2}};
const r={sku:i.sku,state:'P',priceRead:10,quantidadeVisivel:null,frentesConfirmadas:null};
assert.equal(duvidaFrentes(i),true);assert.equal(sugerirFrentes([i],[r])[0].frentesConfirmadas,null);assert.equal(pendenciaFrentes(i,r),true);assert.throws(()=>confirmItems({items:[i]},[r],true),/Confira as frentes/);
for(const count of [1,2,null]){const result=confirmItems({items:[i]},[{...r,frentesConfirmadas:count,frentesEditadas:true,confirmed:true}],true);assert.equal(result.indicators.occurrences.length,count===1?1:0);assert.equal(result.indicators.ICF,count===null?null:count*50);}
assert.equal(duvidaFrentes({...i,observed:{unidades:4}}),false);assert.equal(duvidaFrentes({...i,frentesCandidatas:1}),false);console.log('Empilhados: dúvida, correção, manutenção das frentes e contagem desconhecida aprovadas.');
