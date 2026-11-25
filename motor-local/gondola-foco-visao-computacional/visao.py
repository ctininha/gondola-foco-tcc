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
        roi = img[int(h*.12):int(h*.72)]
        hsv = cv.cvtColor(roi, cv.COLOR_BGR2HSV)
        gray = cv.cvtColor(roi, cv.COLOR_BGR2GRAY)
        edges = cv.Canny(gray, 45, 110)
        # Baixa saturacao, brilho moderado e baixa densidade de bordas.
        neutral = ((hsv[:,:,1]<65)&(hsv[:,:,2]<170)).mean(axis=0)
        density = (edges>0).mean(axis=0)
        score = neutral*(1-density)
        return cv.blur(score.reshape(1,-1), (max(3,w//40),1)).ravel()
    def detectar(self, ref, aud):
        a,b = self.perfil(ref),self.perfil(aud)
        mask = ((b>.48)&(b-a>.20)).astype('uint8')[None,:]
        w=aud.shape[1]
        mask=cv.morphologyEx(mask,cv.MORPH_CLOSE,np.ones((1,max(3,w//45)),np.uint8))
        _,_,stats,_=cv.connectedComponentsWithStats(mask)
        return [dict(x=int(x),largura=int(l),inicio_relativo=round(x/w,4),fim_relativo=round((x+l)/w,4),estado='CANDIDATA_REVISAO') for x,y,l,h,area in stats[1:] if l>=w*.025]

class MotorVisao:
    def executar(self, origem, saida):
        saida.mkdir(parents=True,exist_ok=False)
        p,d=ProcessadorImagem(),DetectorEspacos(); resultados=[]
        for n in range(1,5):
            ref,aud=p.preparar(p.ler(origem/f'referencia-{n}.png'),p.ler(origem/f'auditada-{n}.png'))
            gaps=d.detectar(ref,aud); h,w=aud.shape[:2]; annotated=aud.copy()
            for i,g in enumerate(gaps,1):
                x,l=g['x'],g['largura']; cv.rectangle(annotated,(x,int(h*.12)),(min(w-1,x+l),int(h*.72)),(0,220,255),3); cv.putText(annotated,str(i),(x+4,int(h*.25)),cv.FONT_HERSHEY_SIMPLEX,.7,(0,220,255),2)
            if not cv.imwrite(str(saida/f'prateleira-{n}.png'),np.vstack([ref,annotated])): raise IOError('Falha ao salvar imagem')
            resultados.append(dict(prateleira=n,lacunas=gaps)); print(f'Prateleira {n}: {len(gaps)} regioes candidatas')
        report=dict(status='EXPERIMENTAL',registro_geometrico=False,segmentacao_automatica=False,prateleiras=resultados)
        (saida/'evidencias.json').write_text(json.dumps(report,indent=2),encoding='utf8')
        print('Resultados:',saida)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--origem',type=Path,required=True); parser.add_argument('--saida',type=Path,default=Path('resultados-visao')/str(time.time_ns())); args=parser.parse_args(); MotorVisao().executar(args.origem,args.saida)
