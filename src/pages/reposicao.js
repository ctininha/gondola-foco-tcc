const inteiro=n=>Number.isSafeInteger(n)&&n>=0;
export function reposicao(item){
 const p=item.frentesPrevistas,a=item.frentesConfirmadas;
 const u=item.reference?.unidades??item.unidades;
 const explicit=item.quantidadeConfirmada??item.quantidadeVisivel;
 const observed=item.reviewSource==='AI_ACCEPTED'&&item.observed?.colunas===a&&inteiro(item.observed?.unidades)?item.observed.unidades:null;
 const v=item.state==='A'?0:explicit??observed;
 const valid=inteiro(p)&&p>0&&inteiro(a)&&a<=p;
 const units=valid&&inteiro(u)&&u>=p&&inteiro(v)&&v>=a&&(a!==0||v===0)?Math.max(0,u-v):null;
 const height=valid&&inteiro(u)&&u%p===0&&u/p<=4&&u/p>1&&units!==null&&v===a*(u/p)?u/p:1;
 return {height,units,...(item.state!=='A'&&explicit==null&&observed!=null&&units!=null?{estimated:true}:{})};
}
