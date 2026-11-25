import {norm} from './LeitorPlanograma.js';
const validPrice=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const qty=x=>Number.isInteger(x)&&x>=0?x:null;
import {NormalizadorProdutos} from './NormalizadorProdutos.js';
import {DetectorEspacos} from './DetectorEspacos.js';
export class ComparadorPlanograma{
 constructor({normalizador=new NormalizadorProdutos(),detector=new DetectorEspacos()}={}){Object.assign(this,{normalizador,detector});}
 comparar(expected,data){const index=rows=>{const map=new Map(),unknown=[];for(const r of rows){if(norm(r?.produto)==='vazio')continue;const sku=this.normalizador.associar(r,expected);if(!sku){unknown.push(r);continue;}if(!map.has(sku))map.set(sku,[]);map.get(sku).push(r);}return {map,unknown};};const a=index(data.A),b=index(data.B);const gaps=data.B.filter(r=>norm(r?.produto)==='vazio');
 return expected.map(e=>{const ar=a.map.get(e.sku)||[],br=b.map.get(e.sku)||[];const ref=ar.length===1?ar[0]:null,obs=br.length===1?br[0]:null;let state='I',candidate='I';const sameRegion=ref&&obs&&norm(ref.regiao)&&norm(ref.regiao)===norm(obs.regiao);if(ref&&obs)candidate=sameRegion?'P':'I';else if(ref&&!br.length&&this.detector.compativel(ref,gaps,b.unknown) && expected.filter(other=>{const rr=a.map.get(other.sku)||[];return rr.length===1&&norm(rr[0].regiao)===norm(ref.regiao);}).length===1)candidate='A';// P/A são hipóteses: região genérica e lacuna não provam posição/ausência por SKU.
 const priceRead=obs&&validPrice(obs.preco)?obs.preco:null;const priceCandidate=e.systemPrice===null?'NOT_APPLICABLE':priceRead===null?'MISSING':Math.round(priceRead*100)===Math.round(e.systemPrice*100)?'EVALUABLE':'DIVERGENT';const before=qty(ref?.unidades),after=qty(obs?.unidades);return {...e,state,candidateState:candidate,priceStatus:e.systemPrice===null?'NOT_APPLICABLE':'MISSING',candidatePriceStatus:priceCandidate,priceRead,confidence:null,priceConfidence:null,observedPosition:null,reference:ref,observed:obs,frontReduction:before!==null&&after!==null?Math.max(0,before-after):null,requiresReview:true,actionCandidate:candidate==='A'?(e.stock===null?'Conferência':e.stock>0?'Reposição':'Compras'):null};});}
}
