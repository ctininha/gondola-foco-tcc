import fs from 'node:fs/promises';import path from 'node:path';
import {ComparadorV12} from './comparador-v12.js';
import {MotorAuditoria} from '../motor-local/gondola-foco-prototipo-v045/src/MotorAuditoria.js';
const folder=process.argv[2];if(!folder)throw Error('Informe pasta da auditoria');
const read=async p=>JSON.parse(await fs.readFile(path.join(folder,p),'utf8'));
const row=await read('referencia-validada.json'),geo=row.geometria,prices=await read('ocr/precos-ocr.json');
for(const s of prices.prateleiras){const img=await fs.readFile(path.join(folder,'recortes',`auditada-${s.prateleira}.png`));s.largura=img.readUInt32BE(16);}
const comparator=new ComparadorV12(await read('recortes/evidencias.json'),geo,prices,geo);
const out=path.join(folder,'revisao-comparador-v12-2');
const report=await new MotorAuditoria({comparador:comparator,leitor:{ler:async()=>row.referenciaValidada}}).executar({origem:path.join(folder,'motor'),saida:out});
report.planograma={id:row.id,version:row.version};report.modoExecucao='REPROCESSAMENTO';await fs.writeFile(path.join(out,'relatorio.json'),JSON.stringify(report,null,2));
console.log(report.indicadoresPreliminares);console.log(report.items.map(i=>[i.name,i.candidateState,i.priceRead]));
