import {calculateIndicators} from './indicators.js';
export function confirmItems(report, rows, accepted = false){
 if(accepted!==true)throw Error('Confirme a conclusão da auditoria.');
 if(!Array.isArray(rows)||rows.length!==report.items.length||new Set(rows.map(r=>r.sku)).size!==rows.length)throw Error('Confira todos os produtos.');
 const items=report.items.map(i=>{const r=rows.find(r=>r.sku===i.sku);if(!r||!['P','F','A','I'].includes(r.state))throw Error('Confirmação incompleta: '+i.name);
 const price=r.priceRead,qty=r.quantidadeVisivel;
 if(r.state==='I'&&r.confirmed!==true)throw Error('Revise a dúvida: '+i.name);
 if(price!==null&&(!Number.isFinite(price)||price<0||Math.abs(price*100-Math.round(price*100))>1e-6))throw Error('Preço inválido: '+i.name);
 if(qty!==null&&(!Number.isSafeInteger(qty)||qty<0))throw Error('Quantidade inválida: '+i.name);
 if(r.state==='A'&&(qty!==0||price!==null)||r.state==='I'&&(qty!==null||price!==null)||['P','F'].includes(r.state)&&qty===0)throw Error('Dados incompatíveis: '+i.name);
 const valid=['P','F'].includes(r.state)&&price!==null&&i.systemPrice!=null;
 const priceStatus=valid?(Math.round(price*100)===Math.round(i.systemPrice*100)?'EVALUABLE':'DIVERGENT'):'NOT_APPLICABLE';
 return {...i,state:r.state,priceRead:price,expectedPrice:i.systemPrice,stockQuantity:i.stock??null,priceStatus,priceDivergent:priceStatus==='DIVERGENT',priceConfidence:null,quantidadeVisivel:qty,quantidadeConfirmada:r.edited===true?qty:null,requiresReview:false,reviewSource:r.edited===true?'HUMAN_CORRECTION':'AI_ACCEPTED',actionCandidate:r.state==='A'?(i.stock==null?'Conferência':i.stock>0?'Reposição':'Compras'):null};});
 return {items,indicators:calculateIndicators(items)};
}
