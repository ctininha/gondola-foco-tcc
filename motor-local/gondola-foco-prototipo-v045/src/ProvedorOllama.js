import {readFile} from "node:fs/promises";
export class ProvedorOllama {
 constructor(model="qwen3-vl:8b-instruct"){this.model=model;}
 async reconhecer(path){
 const image=(await readFile(path)).toString("base64");
 const prompt=`A imagem contém dois recortes da mesma prateleira: A em cima (referência), B embaixo (auditada). Analise cada recorte independentemente, da esquerda para a direita. Liste cada grupo de produto uma única vez, sem contar embalagens em profundidade. Ignore fragmentos de produtos nas bordas que não tenham identificação segura. Registre espaços vazios como grupos separados. Para cada grupo informe nome visível, número de colunas frontais, número de embalagens frontais visíveis (incluindo empilhadas), preço da etiqueta em reais e localização horizontal aproximada. Use null quando incerto. Não deduza preços nem quantidades. Retorne apenas JSON compacto no formato {"A":[{"produto":"...","colunas":null,"unidades":null,"preco":null,"regiao":"esquerda|centro|direita"}],"B":[]} . Para espaço vazio use produto "VAZIO" e preco null. Sem resumo.`;
const start=Date.now();
 const res=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(600000),body:JSON.stringify({model:this.model,stream:true,format:'json',options:{temperature:0,num_ctx:8192,num_predict:1800},messages:[{role:'user',content:prompt,images:[image]}]})});
 if(!res.ok)throw Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
 let buf='',raw='',done;const dec=new TextDecoder();
 function line(s){if(!s.trim())return;const p=JSON.parse(s);if(p.error)throw Error(p.error);raw+=p.message?.content||'';if(p.done)done=p;}
 for await(const chunk of res.body){buf+=dec.decode(chunk,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const s of lines)line(s);}
 line(buf+dec.decode());if(!done||done.done_reason!=='stop')throw Error('Resposta incompleta');
 const data=JSON.parse(raw);if(!Array.isArray(data.A)||!Array.isArray(data.B))throw Error('Formato inválido');
 return {data,segundos:(Date.now()-start)/1000,tokens:done.eval_count};
 }}
