import {readFile} from 'node:fs/promises';
export const norm=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
async function linhas(path,header){const [h,...rows]=(await readFile(path,'utf8')).replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);if(norm(h)!==norm(header))throw Error('Cabeçalho inesperado: '+path);return rows.filter(x=>x.trim()).map(x=>x.split(';').map(v=>v.trim()));}
export class LeitorPlanograma{
 async ler(plan,precos){const p=new Map();for(const [sku,price,stock,...extra] of await linhas(precos,'Código de barras;Preço;Quantidade estoque')){if(extra.length||p.has(sku)||!/^\d{8,14}$/.test(sku)||!/^\d+[,.]\d{2}$/.test(price)||!(stock===''||/^\d+$/.test(stock??'')))throw Error('Preço/estoque inválido: '+sku);p.set(sku,{price:Number(price.replace(',','.')),stock:stock===''?null:Number(stock)});}
 const seen=new Set(),pos=new Set();return (await linhas(plan,'Prateleira;Posição;Código de barras;Nome')).map(([shelf,position,sku,name,...extra])=>{if(extra.length||!/^\d{8,14}$/.test(sku)||!name||! /^[1-9]\d*$/.test(shelf)||! /^[1-9]\d*$/.test(position)||seen.has(sku)||pos.has(`${shelf}:${position}`))throw Error('Planograma inválido: '+sku);seen.add(sku);pos.add(`${shelf}:${position}`);return {sku,name,shelf:Number(shelf),position:Number(position),systemPrice:p.get(sku)?.price??null,stock:p.get(sku)?.stock??null};});}
}
