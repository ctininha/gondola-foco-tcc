import argparse, json, time
from pathlib import Path
import cv2 as cv
import numpy as np

class ProcessadorImagem:
    def ler(self, caminho):
        img = cv.imread(str(caminho))
        if img is None: raise ValueError(f'Imagem invalida: {caminho}')
        return img
    def preparar(self, ref, aud):
        # Normalizacao de tamanho, nao registro geometrico validado.
        return cv.resize(ref, (aud.shape[1], aud.shape[0])), aud

class DetectorEspacos:
    def perfil(self, img):
        h,w = img.shape[:2]
        roi = img[int(h*.18):int(h*.78)]
        hsv = cv.cvtColor(roi, cv.COLOR_BGR2HSV)
        gray = cv.cvtColor(roi, cv.COLOR_BGR2GRAY)
        edges = cv.Canny(gray, 45, 110)
        # Fundo neutro escuro, com tolerancia a reflexos e divisorias.
        neutral = ((hsv[:,:,1]<100)&(hsv[:,:,2]<185)).mean(axis=0)
        density = (edges>0).mean(axis=0)
        score = neutral*(1-density)
        return cv.blur(score.reshape(1,-1), (max(3,w//50),1)).ravel()
    def detectar(self, ref, aud):
        a,b = self.perfil(ref),self.perfil(aud)
        w=aud.shape[1]
        # Evidencia de fundo na auditada; referencia apenas corrobora.
        mask = (b>.62).astype('uint8')[None,:]
        mask=cv.morphologyEx(mask,cv.MORPH_CLOSE,np.ones((1,max(3,w//30)),np.uint8))
        _,_,stats,_=cv.connectedComponentsWithStats(mask)
        gaps=[]
        for x,y,l,h,area in stats[1:]:
            if l<w*.05: continue
            delta=float(np.mean(b[x:x+l]-a[x:x+l]))
            if delta<.12: continue
            gaps.append(dict(x=int(x),largura=int(l),inicio_relativo=round(x/w,4),fim_relativo=round((x+l)/w,4),score_fundo=round(float(np.mean(b[x:x+l])),3),diferenca_referencia=round(delta,3),estado='CANDIDATA_REVISAO'))
        return gaps

class MotorVisao:
    def executar(self, origem, saida):
        saida.mkdir(parents=True,exist_ok=False)
        p,d=ProcessadorImagem(),DetectorEspacos(); resultados=[]
        for n in range(1,5):
            ref,aud=p.preparar(p.ler(origem/f'referencia-{n}.png'),p.ler(origem/f'auditada-{n}.png'))
            gaps=d.detectar(ref,aud); h,w=aud.shape[:2]; annotated=aud.copy()
            for i,g in enumerate(gaps,1):
                x,l=g['x'],g['largura']; cv.rectangle(annotated,(x,int(h*.18)),(min(w-1,x+l),int(h*.78)),(0,220,255),3); cv.putText(annotated,str(i),(x+4,int(h*.25)),cv.FONT_HERSHEY_SIMPLEX,.7,(0,220,255),2)
            if not cv.imwrite(str(saida/f'prateleira-{n}.png'),np.vstack([ref,annotated])): raise IOError('Falha ao salvar imagem')
            resultados.append(dict(prateleira=n,lacunas=gaps)); print(f'Prateleira {n}: {len(gaps)} regioes candidatas')
        report=dict(versao='0.3.1',status='EXPERIMENTAL',registro_geometrico=False,segmentacao_automatica=False,prateleiras=resultados)
        (saida/'evidencias.json').write_text(json.dumps(report,indent=2),encoding='utf8')
        print('Resultados:',saida)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--origem',type=Path,required=True); parser.add_argument('--saida',type=Path,default=Path('resultados-visao')/str(time.time_ns())); args=parser.parse_args(); MotorVisao().executar(args.origem,args.saida)
