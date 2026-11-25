import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
export function csvInputs(items) {
  if (!Array.isArray(items) || !items.length) throw Error('Planograma vazio');
  const skus=new Set(), positions=new Set();
  const plan=['Prateleira;Posição;Código de barras;Nome'], prices=['Código de barras;Preço;Quantidade estoque'];
  for(const i of items){
    const sku=String(i.sku), name=String(i.name??''), s=Number(i.shelf), p=Number(i.position), pos=`${s}:${p}`;
    if(!/^\d{8,14}$/.test(sku)||!name.trim()||/[;\r\n]/.test(name)||!Number.isSafeInteger(s)||s<1||!Number.isSafeInteger(p)||p<1||skus.has(sku)||positions.has(pos)) throw Error('Item inválido ou duplicado: '+sku);
    skus.add(sku);positions.add(pos);plan.push(`${s};${p};${sku};${name}`);
    if(i.price!=null){if(typeof i.price!=='number'||!Number.isFinite(i.price)||i.price<0||i.price>=1e9) throw Error('Preço inválido: '+sku);const stock=i.stockQuantity;if(stock!=null&&(!Number.isSafeInteger(stock)||stock<0)) throw Error('Estoque inválido: '+sku);prices.push(`${sku};${i.price.toFixed(2)};${stock??''}`);}
  }
  return [plan.join('\n')+'\n',prices.join('\n')+'\n'];
}
export async function runLocal({root,folder,items,reference,shelf}){
  const [plan,prices]=csvInputs(items);fs.mkdirSync(folder,{recursive:true});
  const planPath=path.join(folder,'plan.csv'),pricePath=path.join(folder,'prices.csv'),out=path.join(folder,'resultado');
  fs.writeFileSync(planPath,plan);fs.writeFileSync(pricePath,prices);
  const script=path.join(root,'motor-local','gondola-foco-visao-computacional','auditar_v10.py');
  const python=process.env.LOCAL_PYTHON||'python3';
  await new Promise((resolve,reject)=>{const child=spawn(python,[script,'--referencia',reference,'--auditada',shelf,'--planograma',planPath,'--precos',pricePath,'--saida',out],{stdio:['ignore','inherit','inherit']});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Motor local interrompido. Consulte o Terminal da API.')));});
  return JSON.parse(fs.readFileSync(path.join(out,'relatorio.json'),'utf8'));
}
