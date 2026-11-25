import {ComparadorHibrido} from './ComparadorHibrido.js';
import {norm} from './LeitorPlanograma.js';
export class ComparadorConsolidado extends ComparadorHibrido {
 constructor(ev,loc,sem){super(ev);this.loc=loc;this.sem=sem;}
 comparar(expected,data){
 const items=super.comparar(expected,data), n=expected[0].shelf;
 const ids=rows=>rows.filter(r=>norm(r.produto)!=='vazio').map(r=>this.normalizador.associar(r,expected));
 const a=ids(data.A),b=ids(data.B),order=[...expected].sort((x,y)=>x.position-y.position).map(x=>x.sku);
 const clean=a.length===order.length&&a.every((x,i)=>x===order[i])&&b.every(Boolean)&&new Set(b).size===b.length;
 const moved=new Set(); if(clean) for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++)if(order.indexOf(b[i])>order.indexOf(b[j])){moved.add(b[i]);moved.add(b[j]);}
 const l=this.loc.prateleiras.find(p=>p.arquivo===`referencia-${n}.png`),s=this.sem.prateleiras.find(p=>p.arquivo===l?.arquivo);
 const ds=s?.decisoes??[], w=l?.largura;
 const valid=Number.isInteger(w)&&w>0&&ds.length===l?.transicoes.length&&ds.every((d,i)=>d.x===l.transicoes[i].x&&Number.isInteger(d.x)&&d.x>0&&d.x<w&&(i===0||d.x>ds[i-1].x));
 const assoc=name=>this.normalizador.associar({produto:name},expected);
 const agree=(d,v)=>d.consolidacao?.situacao==='CONCORDANCIA'&&d.consolidacao?.decisao===v&&d.decisao===v;
 const gaps=this.evidencias.prateleiras.find(p=>p.prateleira===n).lacunas;
 return items.map(i=>{
 let candidate=i.candidateState,evidence=i.evidenciaVisual;
 if(clean&&moved.has(i.sku)&&i.observed)candidate='F';
 if(clean&&valid&&!moved.size&&!b.includes(i.sku)&&i.reference){
 const pairs=[];
 for(let j=0;j<ds.length;j++)for(let k=j+1;k<ds.length;k++){
 const left=ds[j],right=ds[k];
 if(!agree(left,'SEPARAR')||!agree(right,'SEPARAR')||assoc(left.direita)!==i.sku||assoc(right.esquerda)!==i.sku||!assoc(left.esquerda)||!assoc(right.direita)||assoc(left.esquerda)===i.sku||assoc(right.direita)===i.sku)continue;
 if(!ds.slice(j+1,k).every(d=>agree(d,'UNIR')&&assoc(d.esquerda)===i.sku&&assoc(d.direita)===i.sku))continue;
 const start=left.x/w,end=right.x/w;
 for(const g of gaps){if(!Number.isFinite(g.inicio_relativo)||!Number.isFinite(g.fim_relativo)||g.inicio_relativo<0||g.fim_relativo>1||g.fim_relativo<=g.inicio_relativo)continue;const overlap=Math.max(0,Math.min(end,g.fim_relativo)-Math.max(start,g.inicio_relativo))/(end-start);if(overlap>=.65)pairs.push({metodo:'LIMITES_SEMANTICOS_EXPERIMENTAL',intervaloEstimado:[start,end],sobreposicao:overlap,lacuna:g,registroGeometrico:false});}
 }
 if(pairs.length===1){candidate='A';evidence=pairs[0];}
 }
 const qty=r=>Number.isInteger(r?.unidades)&&r.unidades>=0?r.unidades:null;
 const before=qty(i.reference),after=qty(i.observed);
 return {...i,candidateState:candidate,evidenciaVisual:evidence,quantidadeReferencia:before,quantidadeVisivel:after,diferencaVisivel:before!==null&&after!==null?after-before:null,criterioPosicao:moved.has(i.sku)?'INVERSAO_ORDEM_RELATIVA_EXPERIMENTAL':null,actionCandidate:candidate==='A'?(i.stock===null?'Conferência':i.stock>0?'Reposição':'Compras'):null};
 });
 }
}
