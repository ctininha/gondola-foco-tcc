import {norm} from './LeitorPlanograma.js';
// Evidência textual regional, NÃO visão computacional nem confirmação de ausência.
export class DetectorEspacos {
  compativel(ref,gaps,unknown){
    const region=norm(ref?.regiao); if(!region)return false;
    return gaps.some(g=>norm(g.regiao)===region)&&!unknown.some(u=>!norm(u.regiao)||norm(u.regiao)===region);
  }
}
