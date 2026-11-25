import {norm} from './LeitorPlanograma.js';
import {NormalizadorProdutos} from './NormalizadorProdutos.js';
// Estimativa proporcional às frentes, não localização geométrica medida.
export class ValidadorEvidencias {
 constructor({normalizador=new NormalizadorProdutos(),minOverlap=0.65}={}){Object.assign(this,{normalizador,minOverlap});}
 avaliar(expected,data,lacunas){
  const result=new Map(); const a=data.A.filter(r=>norm(r.produto)!=='vazio'), b=data.B.filter(r=>norm(r.produto)!=='vazio');
  const ids=rows=>rows.map(r=>this.normalizador.associar(r,expected));
  const ai=ids(a),bi=ids(b),ordered=[...expected].sort((x,y)=>x.position-y.position).map(e=>e.sku);
  if(ai.length!==ordered.length||ai.some((id,i)=>id!==ordered[i])||bi.some(id=>!id)||new Set(bi).size!==bi.length||bi.some((id,i)=>i>0&&ordered.indexOf(id)<=ordered.indexOf(bi[i-1]))||a.some(r=>!Number.isInteger(r.colunas)||r.colunas<=0))return result;
  const total=a.reduce((s,r)=>s+r.colunas,0);let start=0;
  for(let i=0;i<a.length;i++){
   const end=start+a[i].colunas/total;const sku=ai[i];
   if(!bi.includes(sku)){
    const candidates=lacunas.filter(g=>Number.isFinite(g.inicio_relativo)&&Number.isFinite(g.fim_relativo)&&g.inicio_relativo>=0&&g.fim_relativo<=1&&g.fim_relativo>g.inicio_relativo).map(g=>({g,overlap:Math.max(0,Math.min(end,g.fim_relativo)-Math.max(start,g.inicio_relativo))/(end-start)})).filter(x=>x.overlap>=this.minOverlap);
    if(candidates.length===1)result.set(sku,{metodo:'FRENTES_PROPORCIONAIS_EXPERIMENTAL',intervaloEstimado:[start,end],sobreposicao:candidates[0].overlap,lacuna:candidates[0].g,registroGeometrico:false});
   }start=end;
  }return result;
 }
}
