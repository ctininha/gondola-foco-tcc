import {test} from 'node:test';import assert from 'node:assert/strict';import {ValidadorEvidencias} from '../src/ValidadorEvidencias.js';import {ComparadorHibrido} from '../src/ComparadorHibrido.js';import {IndicadorCobertura} from '../src/IndicadorCobertura.js';
const expected=['Alfa','Beta','Gama','Delta'].map((name,i)=>({name,sku:String(i),position:i+1,shelf:1,stock:0,systemPrice:1}));const A=expected.map(e=>({produto:e.name,colunas:2,unidades:2,regiao:'centro',preco:1}));const B=[A[0],A[3]];const g={inicio_relativo:.25,fim_relativo:.75};const v=new ValidadorEvidencias();
test('uma lacuna pode apoiar dois SKUs',()=>assert.equal(v.avaliar(expected,{A,B},[g]).size,2));
test('lacuna incompatível não apoia ausência',()=>assert.equal(v.avaliar(expected,{A,B},[{inicio_relativo:0,fim_relativo:.2}]).size,0));
test('produto desconhecido impede inferência',()=>assert.equal(v.avaliar(expected,{A,B:[...B,{produto:'Outro'}]},[g]).size,0));
test('referência incompleta impede inferência',()=>assert.equal(v.avaliar(expected,{A:A.slice(1),B},[g]).size,0));
test('presença contradiz lacuna',()=>assert.equal(v.avaliar(expected,{A,B:A},[g]).size,0));
test('hipótese não altera estado confirmado',()=>{const r=new ComparadorHibrido({prateleiras:[{prateleira:1,lacunas:[g]}]}).comparar(expected,{A,B});assert.equal(r[1].candidateState,'A');assert.equal(r[1].state,'I');assert.equal(r[1].actionCandidate,'Compras');assert.equal(IndicadorCobertura.calcular(r).percentual,0);});
