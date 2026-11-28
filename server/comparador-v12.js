import {ComparadorV071} from '../motor-local/gondola-foco-prototipo-v045/src/ComparadorV071.js';
import {norm} from '../motor-local/gondola-foco-prototipo-v045/src/LeitorPlanograma.js';
export class ComparadorV12 extends ComparadorV071 {
 comparar(expected,data){
 const B=[];
 for(const r of data.B){const sku=this.normalizador.associar(r,expected),last=B.at(-1);
 if(sku&&last&&this.normalizador.associar(last,expected)===sku&&norm(last.regiao)===norm(r.regiao)){last.colunas=null;last.unidades=null;continue;}
 B.push({...r});}
 // Resolve generic descriptions only with unique ordered spatial assignment.
 const n=expected[0].shelf, order=[...expected].sort((a,b)=>a.position-b.position);
 const ref=this.anchors.prateleiras.find(p=>p.prateleira===n), aud=this.ocr.prateleiras.find(p=>p.prateleira===n);
 const rows=B.filter(r=>norm(r.produto)!=='vazio');
 const center=(e,p)=>(e.x+e.largura/2)/p.largura;
 if(ref?.etiquetas.length===order.length&&aud?.etiquetas.length===rows.length&&rows.length<=order.length){
 const rr=[...ref.etiquetas].sort((a,b)=>a.x-b.x),aa=[...aud.etiquetas].sort((a,b)=>a.x-b.x);
 const solutions=[];
 const walk=(j,k,chosen)=>{if(j===rows.length){solutions.push(chosen);return;}for(let x=k;x<order.length;x++){
 const r=rows[j], known=this.normalizador.associar(r,expected), name=norm(order[x].name), words=norm(r.produto).match(/\p{L}+|\d+/gu)||[];
 if(known?known!==order[x].sku:!words.length||!words.every(w=>(name.match(/\p{L}+|\d+/gu)||[]).includes(w)))continue;
 const c=center(rr[x],ref),sep=Math.min(...rr.filter((_,i)=>i!==x).map(e=>Math.abs(center(e,ref)-c)));
 if(Math.abs(c-center(aa[j],aud))>Math.min(.09,sep*.45))continue;
 walk(j+1,x+1,[...chosen,x]);}};
 walk(0,0,[]);
 if(solutions.length===1)rows.forEach((r,j)=>{r.produto=order[solutions[0][j]].name;});
 }
 const A=data.A.map(r=>({...r}));
 const result=super.comparar(expected,{A,B});
 // A visible group with a matched label can still be position-ambiguous.
 return result.map(i=>({...i,quantidadeVisivel:i.candidateState==='A'?0:null,diferencaVisivel:i.candidateState==='A'?-i.unidades:null,frontReduction:null,frentesPrevistas:Number.isSafeInteger(i.colunas)&&i.colunas>0?i.colunas:null,frentesCandidatas:i.candidateState==='A'?0:['P','F'].includes(i.candidateState)&&Number.isSafeInteger(i.observed?.colunas)&&i.observed.colunas>0?i.observed.colunas:null}));
 }
}
