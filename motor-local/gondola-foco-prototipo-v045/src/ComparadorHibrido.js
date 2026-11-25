import {ComparadorPlanograma} from './ComparadorPlanograma.js';
import {ValidadorEvidencias} from './ValidadorEvidencias.js';
export class ComparadorHibrido extends ComparadorPlanograma {
 constructor(evidencias){super();this.evidencias=evidencias;this.validador=new ValidadorEvidencias();}
 comparar(expected,data){const lacunas=this.evidencias.prateleiras.find(p=>p.prateleira===expected[0]?.shelf)?.lacunas;if(!Array.isArray(lacunas))throw Error('Evidência visual ausente para prateleira');const matches=this.validador.avaliar(expected,data,lacunas);return super.comparar(expected,data).map(i=>{const evidence=matches.get(i.sku);const candidate=i.candidateState==='A'?'I':i.candidateState;const state=evidence&&!i.observed?'A':candidate;return {...i,candidateState:state,evidenciaVisual:evidence??null,actionCandidate:state==='A'?(i.stock===null?'Conferência':i.stock>0?'Reposição':'Compras'):null};});}
}
