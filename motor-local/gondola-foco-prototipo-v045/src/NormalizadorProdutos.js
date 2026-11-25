import {norm} from './LeitorPlanograma.js';
const tokens=s=>norm(s).match(/\p{L}+|\d+(?:[.,]\d+)?/gu)||[];
const withoutSize=s=>norm(s).replace(/\s+\d+\s*(kg|ml|g|l)$/,'');
export class NormalizadorProdutos {
  associar(row,expected){
    const n=norm(row?.produto); if(!n||n==='vazio')return null;
    const t=tokens(n); const candidates=expected.filter(e=>t.every(w=>tokens(e.name).includes(w)));
    if(candidates.length===1)return candidates[0].sku;
    // Preferência por descrição completa somente quando inequívoca no cadastro.
    const exact=candidates.filter(e=>withoutSize(e.name)===n||norm(e.name)===n);
    return exact.length===1?exact[0].sku:null;
  }
}
