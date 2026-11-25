import {ComparadorConsolidado} from './ComparadorConsolidado.js';
import {norm} from './LeitorPlanograma.js';
export class ComparadorV07 extends ComparadorConsolidado {
 constructor(ev,loc,ocr,anchors,sem={prateleiras:[]}){super(ev,loc,sem);this.ocr=ocr;this.anchors=anchors;}
 comparar(expected,data){
 const items=super.comparar(expected,data), n=expected[0].shelf;
 const ids=rows=>rows.filter(r=>norm(r.produto)!=='vazio').map(r=>this.normalizador.associar(r,expected));
 const a=ids(data.A), b=ids(data.B), order=[...expected].sort((x,y)=>x.position-y.position).map(e=>e.sku);
 const clean=a.length===order.length&&a.every((v,i)=>v===order[i])&&b.every(Boolean)&&new Set(b).size===b.length;
 const ref=this.anchors.prateleiras.find(p=>p.prateleira===n), aud=this.ocr.prateleiras.find(p=>p.prateleira===n);
 const valid=p=>p&&Number.isInteger(p.largura)&&p.largura>0&&Array.isArray(p.etiquetas)&&p.etiquetas.every(e=>Number.isFinite(e.x)&&e.x>=0&&e.largura>0&&e.x+e.largura<=p.largura);
 const sorted=p=>[...p.etiquetas].sort((a,b)=>a.x-b.x);
 const center=(e,p)=>(e.x+e.largura/2)/p.largura;
 const matches=new Map();
 if(clean&&valid(ref)&&valid(aud)&&ref.etiquetas.length===order.length){
 const rr=sorted(ref), aa=sorted(aud);
 for(const e of aa){const distances=rr.map((r,i)=>({sku:order[i],d:Math.abs(center(r,ref)-center(e,aud))})).sort((x,y)=>x.d-y.d);
 const best=distances[0]; if(best.d<=.045&&(!distances[1]||distances[1].d-best.d>=.035)){if(!matches.has(best.sku))matches.set(best.sku,[]);matches.get(best.sku).push(e);}}
 }
 const gaps=this.evidencias.prateleiras.find(p=>p.prateleira===n).lacunas;
 return items.map(i=>{
 let state=i.candidateState, evidence=i.evidenciaVisual;
 const es=matches.get(i.sku)||[], e=es.length===1?es[0]:null;
 const anchor=clean&&valid(ref)&&ref.etiquetas.length===order.length?center(sorted(ref)[order.indexOf(i.sku)],ref):null;
 const inside=anchor!==null&&gaps.some(g=>anchor>=g.inicio_relativo+.025&&anchor<=g.fim_relativo-.025);
 if(clean&&!b.includes(i.sku)&&inside&&!e&&valid(aud)&&aud.etiquetas.length===b.length&&b.every(s=>matches.get(s)?.length===1)){state='A';evidence={metodo:'ANCORA_ETIQUETA_REFERENCIA_E_LACUNA',ancora:anchor,registroGeometrico:false};}
 if(clean&&i.observed&&e&&state==='I'&&b.every((s,j)=>j===0||order.indexOf(s)>order.indexOf(b[j-1]))&&!inside)state='P';
 const price=i.observed&&e?.status==='CANDIDATO'&&typeof e.preco==='number'&&Number.isFinite(e.preco)&&e.preco>=0?e.preco:null;
 const ps=i.systemPrice===null?'NOT_APPLICABLE':price===null?'MISSING':Math.round(price*100)===Math.round(i.systemPrice*100)?'EVALUABLE':'DIVERGENT';
 return {...i,candidateState:state,evidenciaVisual:evidence,priceRead:price,candidatePriceStatus:ps,evidenciaPreco:e,metodoPreco:e?'ANCORA_ESPACIAL_EXPERIMENTAL':null,quantidadeVisivel:state==='A'?0:i.quantidadeVisivel,diferencaVisivel:state==='A'&&i.quantidadeReferencia!==null?-i.quantidadeReferencia:i.diferencaVisivel,actionCandidate:state==='A'?(i.stock===null?'Conferência':i.stock>0?'Reposição':'Compras'):null};
 });
 }
}
