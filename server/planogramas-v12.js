import express from 'express';
import {reconhecerReferencia,validarConferencia} from './referencia-v12.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import multer from 'multer';
import {LeitorPlanograma} from '../motor-local/gondola-foco-prototipo-v045/src/LeitorPlanograma.js';
const exec=promisify(execFile);
export function installPlanogramas(app,root){
 const base=path.join(root,'data','planogramas-v12');
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:3,fields:3}}).fields([{name:'foto',maxCount:1},{name:'plan',maxCount:1},{name:'precos',maxCount:1}]);
 const read=async id=>JSON.parse(await fs.readFile(path.join(base,id,'cadastro.json'),'utf8'));
 const saveRow=async row=>{const folder=path.join(base,row.id);await fs.writeFile(path.join(folder,'cadastro.tmp'),JSON.stringify(row,null,2));await fs.rename(path.join(folder,'cadastro.tmp'),path.join(folder,'cadastro.json'));};
 const getRow=async id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('ID inválido');return read(id);};
 const list=async()=>{await fs.mkdir(base,{recursive:true});const rows=[];for(const id of await fs.readdir(base)){if(!/^[a-f0-9-]{36}$/.test(id))continue;try{rows.push(await read(id));}catch(e){if(e.code!=='ENOENT')throw e;}}return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));};
 const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error(e.message);res.status(400).json({error:e.message});}};
 let busy=false;
 app.get('/api/planogramas',route(async(req,res)=>res.json(await list())));
 app.get('/api/planogramas/:id/foto',route(async(req,res)=>{if(!/^[a-f0-9-]{36}$/.test(req.params.id))throw Error('ID inválido');await read(req.params.id);res.sendFile(path.join(base,req.params.id,'referencia.png'));}));
 app.post('/api/planogramas/:id/reconhecer',route(async(req,res)=>{
 if(busy)return res.status(409).json({error:'Processamento em andamento'});busy=true;
 try{const row=await getRow(req.params.id);if(row.status!=='PENDENTE_RECONHECIMENTO')throw Error('Referência não está pendente');
 row.reconhecimento=await reconhecerReferencia(path.join(base,row.id),row);row.status='PENDENTE_CONFERENCIA';await saveRow(row);res.json(row);
 }finally{busy=false;}
 }));
 app.post('/api/planogramas/:id/aprovar',express.json({limit:'256kb'}),route(async(req,res)=>{
 if(busy)return res.status(409).json({error:'Processamento em andamento'});busy=true;
 try{const row=await getRow(req.params.id);if(row.status!=='PENDENTE_CONFERENCIA')throw Error('Reconhecimento pendente');
 row.referenciaValidada=validarConferencia(row.items,req.body?.produtos);row.status='APROVADO';row.approvedAt=new Date().toISOString();await saveRow(row);res.json(row);
 }finally{busy=false;}
 }));
 app.post('/api/planogramas',upload,route(async(req,res)=>{
 if(busy)return res.status(409).json({error:'Cadastro em processamento'});busy=true;
 try{const fields=Object.fromEntries(['loja','setor','gondola'].map(k=>[k,String(req.body[k]||'').trim()]));if(Object.values(fields).some(v=>!v||v.length>100))throw Error('Informe loja, setor e gôndola');
 const files=req.files;if(!files?.foto?.[0]||!files?.plan?.[0]||!files?.precos?.[0])throw Error('Envie os três arquivos');
 const id=randomUUID(),folder=path.join(base,id);await fs.mkdir(folder,{recursive:true});
 for(const [key,name] of [['foto','referencia.png'],['plan','plan.csv'],['precos','precos.csv']])await fs.writeFile(path.join(folder,name),files[key][0].buffer);
 const items=await new LeitorPlanograma().ler(path.join(folder,'plan.csv'),path.join(folder,'precos.csv'));if(!items.length)throw Error('Planograma vazio');
 const versions=(await list()).filter(r=>['loja','setor','gondola'].every(k=>r[k]===fields[k]));
 const row={id,...fields,version:Math.max(0,...versions.map(r=>r.version))+1,createdAt:new Date().toISOString(),status:'PROCESSANDO',items};
 const save=async()=>{await fs.writeFile(path.join(folder,'cadastro.tmp'),JSON.stringify(row,null,2));await fs.rename(path.join(folder,'cadastro.tmp'),path.join(folder,'cadastro.json'));};await save();
 try{await exec(process.env.LOCAL_PYTHON||'python3',[path.join(root,'motor-local/gondola-foco-visao-computacional/cadastrar_v12.py'),folder],{timeout:120000});row.geometria=JSON.parse(await fs.readFile(path.join(folder,'geometria.json'),'utf8'));row.status='PENDENTE_RECONHECIMENTO';}catch(e){row.status='FALHA';row.error=e.stderr||e.message;}await save();res.json(row);
 }finally{busy=false;}
 }));
}
