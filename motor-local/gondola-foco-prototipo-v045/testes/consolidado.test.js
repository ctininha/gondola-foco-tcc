import test from 'node:test';import assert from 'node:assert/strict';import {ComparadorConsolidado} from '../src/ComparadorConsolidado.js';
const e=['Alfa','Beta','Gama'].map((name,i)=>({name,sku:String(i),position:i+1,shelf:1,stock:2,systemPrice:5}));
const row=produto=>({produto,colunas:1,unidades:2,regiao:'centro',preco:5});
const d=(x,esquerda,direita)=>({x,esquerda,direita,decisao:'SEPARAR',consolidacao:{situacao:'CONCORDANCIA',decisao:'SEPARAR'}});
const make=(gap=true)=>new ComparadorConsolidado({prateleiras:[{prateleira:1,lacunas:gap?[{inicio_relativo:.39,fim_relativo:.59}]:[]}]},{prateleiras:[{arquivo:'referencia-1.png',largura:100,transicoes:[{x:40},{x:60}]}]},{prateleiras:[{arquivo:'referencia-1.png',decisoes:[d(40,'Alfa','Beta'),d(60,'Beta','Gama')]}]});
test('limites semânticos apoiam ausência sem confirmar',()=>{const r=make().comparar(e,{A:e.map(x=>row(x.name)),B:[row('Alfa'),row('Gama')]});assert.equal(r[1].candidateState,'A');assert.equal(r[1].state,'I');assert.equal(r[1].evidenciaVisual.metodo,'LIMITES_SEMANTICOS_EXPERIMENTAL');});
test('sem lacuna não infere ausência',()=>assert.equal(make(false).comparar(e,{A:e.map(x=>row(x.name)),B:[row('Alfa'),row('Gama')]})[1].candidateState,'I'));
test('inversão de ordem e contagem visível',()=>{const r=make(false).comparar(e,{A:e.map(x=>row(x.name)),B:[row('Beta'),{...row('Alfa'),unidades:1},row('Gama')]});assert.equal(r[0].candidateState,'F');assert.equal(r[1].candidateState,'F');assert.equal(r[0].diferencaVisivel,-1);assert.equal(r[0].state,'I');});
