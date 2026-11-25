import argparse, json, time
from pathlib import Path
import cv2
import numpy as np

class LocalizadorProdutos:
    """Propõe transições de aparência, não identifica SKUs."""
    def localizar(self, imagem):
        h,w=imagem.shape[:2]
        if h<30 or w<100: raise ValueError('Recorte pequeno demais')
        # Exclui margens verticais; não depende da cor da etiqueta.
        lab=cv2.cvtColor(imagem[int(h*.12):int(h*.78)],cv2.COLOR_BGR2LAB)
        k=max(5,round(w*.025)); step=max(1,w//500)
        def hist(a):
            v=cv2.calcHist([a],[0,1,2],None,[8,8,8],[0,256]*3).ravel()
            return v/max(v.sum(),1)
        xs=list(range(k,w-k,step))
        scores=np.array([cv2.compareHist(hist(lab[:,x-k:x]),hist(lab[:,x:x+k]),cv2.HISTCMP_BHATTACHARYYA) for x in xs])
        scores=np.convolve(scores,np.ones(5)/5,mode='same')
        lim=max(.20,float(np.median(scores)+1.5*np.median(abs(scores-np.median(scores)))))
        peaks=[]
        for i in sorted(range(1,len(xs)-1),key=lambda i:scores[i],reverse=True):
            if scores[i]<lim: break
            if scores[i]>=scores[i-1] and scores[i]>=scores[i+1] and all(abs(xs[i]-p['x'])>=w*.045 for p in peaks):
                peaks.append({'x':xs[i],'x_relativo':xs[i]/w,'score_transicao':round(float(scores[i]),4)})
        return sorted(peaks,key=lambda p:p['x'])

class MotorLocalizacao:
    def executar(self, origem, saida):
        saida.mkdir(parents=True,exist_ok=False); rel=[]
        for path in sorted(origem.glob('referencia-*.png')):
            im=cv2.imread(str(path));
            if im is None: raise ValueError(f'Imagem ilegivel: {path}')
            p=LocalizadorProdutos().localizar(im); h,w=im.shape[:2]
            for i,r in enumerate(p,1):
                x=r['x']; cv2.line(im,(x,0),(x,h-1),(0,255,255),2); cv2.putText(im,str(i),(x+3,20),cv2.FONT_HERSHEY_SIMPLEX,.5,(0,0,0),3); cv2.putText(im,str(i),(x+3,20),cv2.FONT_HERSHEY_SIMPLEX,.5,(0,255,255),1)
            if not cv2.imwrite(str(saida/path.name),im): raise IOError('Falha ao gravar imagem')
            rel.append({'arquivo':path.name,'largura':w,'transicoes':p}); print(f'{path.name}: {len(p)} transicoes candidatas')
        if not rel: raise ValueError('Nenhuma referencia encontrada')
        (saida/'localizacao.json').write_text(json.dumps({'status':'EXPERIMENTAL_SEM_ASSOCIACAO_SKU','prateleiras':rel},indent=2),encoding='utf8'); print('Resultados:',saida)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--origem',type=Path,required=True); args=parser.parse_args(); MotorLocalizacao().executar(args.origem,Path('resultados-localizacao')/str(time.time_ns()))
