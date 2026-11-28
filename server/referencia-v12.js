import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NormalizadorProdutos} from '../motor-local/gondola-foco-prototipo-v045/src/NormalizadorProdutos.js';
export async function reconhecerReferencia(folder,row,fetcher=fetch){
 const results=[];const normalizador=new NormalizadorProdutos();
 for(const shelf of row.geometria.prateleiras){
 const expected=row.items.filter(i=>i.shelf===shelf.prateleira);
 const image=(await readFile(path.join(folder,`referencia-${shelf.prateleira}.png`))).toString('base64');
 const prompt='Analise esta única fotografia de prateleira da esquerda para a direita. Liste cada grupo distinto visível uma vez, ignore fragmentos ambíguos. Informe nome visível, colunas frontais, unidades frontais incluindo empilhadas, região esquerda/centro/direita. Não conte profundidade. Use null quando incerto. JSON: {"produtos":[{"produto":"nome","colunas":null,"unidades":null,"regiao":"centro"}]}';
 const res=await fetcher('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(180000),body:JSON.stringify({model:'qwen3-vl:8b-instruct',stream:false,format:'json',options:{temperature:0,num_ctx:8192,num_predict:1000},messages:[{role:'user',content:prompt,images:[image]}]})});
 if(!res.ok)throw Error(`Ollama HTTP ${res.status}`);const raw=await res.json();if(raw.done_reason!=='stop')throw Error('Resposta incompleta');const data=JSON.parse(raw.message.content);if(!Array.isArray(data.produtos))throw Error('Formato inválido');
 results.push({prateleira:shelf.prateleira,segundos:raw.total_duration/1e9,produtos:data.produtos.map(p=>({...p,sku:normalizador.associar(p,expected)}))});
 }return results;
}
export function validarConferencia(items,entries){
 if(!Array.isArray(entries)||entries.length!==items.length)throw Error('Confira todos os produtos');
 const seen=new Set();return entries.map(e=>{const item=items.find(i=>i.sku===e.sku);if(!item||seen.has(e.sku)||e.confirmado!==true||!Number.isSafeInteger(e.unidades)||e.unidades<1||!Number.isSafeInteger(e.colunas)||e.colunas<1||e.colunas>e.unidades)throw Error(item?`Conferência pendente: ${item.name} (Prateleira ${item.shelf}, posição ${item.position}). Revise colunas, unidades e confirmação.`:'Revise a lista de produtos antes de aprovar.');seen.add(e.sku);return {...item,unidades:e.unidades,colunas:e.colunas,confirmado:true};});
}
