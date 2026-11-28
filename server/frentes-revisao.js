import {calculateIndicators} from './indicators.js';
export function duvidaFrentes(i){
 const c=i.frentesPrevistas,u=i.reference?.unidades??i.unidades,b=i.observed?.unidades;
 return ['P','F'].includes(i.candidateState)&&Number.isSafeInteger(c)&&Number.isSafeInteger(u)&&u>c&&Number.isSafeInteger(b)&&b>0&&b<u&&i.frentesCandidatas===c;
}
export function pendenciaFrentes(i,r){return !!i&&!!r&&['P','F'].includes(r.state)&&duvidaFrentes(i)&&!(r.frentesEditadas===true&&r.confirmed===true);}
// Sugestões são aceitas apenas na conclusão explícita da auditoria.
export function sugerirFrentes(items, rows){
 return rows.map(r=>{
  const i=items.find(i=>i.sku===r.sku);
  if(!i||duvidaFrentes(i)||!['P','F'].includes(r.state)||r.state!==i.candidateState||r.frentesConfirmadas!=null||r.frentesEditadas===true||!Number.isSafeInteger(i.frentesCandidatas)||i.frentesCandidatas<=0)return r;
  return {...r,frentesConfirmadas:i.frentesCandidatas};
 });
}

// Projeção preliminar: não altera o relatório bruto nem confirma dados.
export function indicadoresSugeridos(items, rows){
 const suggested=sugerirFrentes(items,rows);
 return calculateIndicators(items.map(i=>{
  const r=suggested.find(r=>r.sku===i.sku);
  const present=['P','F'].includes(r.state);
  const priceValid=present&&Number.isFinite(r.priceRead)&&r.priceRead>=0&&Number.isFinite(i.systemPrice);
  return {...i,quantidadeVisivel:r.quantidadeVisivel??null,quantidadeConfirmada:r.edited===true?r.quantidadeVisivel??null:null,reviewSource:r.edited===true||r.frentesEditadas===true||r.state!==i.candidateState?'HUMAN_CORRECTION':'AI_ACCEPTED',state:r.state,priceRead:r.priceRead,priceStatus:priceValid?(Math.round(r.priceRead*100)===Math.round(i.systemPrice*100)?'EVALUABLE':'DIVERGENT'):'NOT_APPLICABLE',frentesConfirmadas:r.state==='A'?0:present&&Number.isSafeInteger(r.frentesConfirmadas)&&r.frentesConfirmadas>0?r.frentesConfirmadas:null};
 }));
}
