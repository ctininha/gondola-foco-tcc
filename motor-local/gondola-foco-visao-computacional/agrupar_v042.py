import argparse,json,time
from pathlib import Path
import cv2
import numpy as np

class AgrupadorProdutos:
    def __init__(self, limite=.42):
        if not 0<limite<1: raise ValueError('Limite invalido')
        self.limite=limite
    def descritor(self,im):
        lab=cv2.cvtColor(im,cv2.COLOR_BGR2LAB)
        hist=cv2.calcHist([lab],[0,1,2],None,[8,8,8],[0,256]*3).ravel(); hist/=max(hist.sum(),1)
        gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        gx=cv2.Sobel(gray,cv2.CV_32F,1,0); gy=cv2.Sobel(gray,cv2.CV_32F,0,1)
        mag,ang=cv2.cartToPolar(gx,gy,angleInDegrees=True)
        tex=np.histogram(ang%180,bins=9,range=(0,180),weights=mag)[0].astype(np.float32); tex/=max(tex.sum(),1)
        return hist,tex
    def distancia(self,a,b):
        return .85*cv2.compareHist(a[0],b[0],cv2.HISTCMP_BHATTACHARYYA)+.15*cv2.compareHist(a[1],b[1],cv2.HISTCMP_BHATTACHARYYA)
    def agrupar(self,im,transicoes):
        h,w=im.shape[:2]
        if h<30 or w<100: raise ValueError('Imagem pequena')
        xs=[t['x'] for t in transicoes]
        if any(type(x)!=int or not 0<x<w for x in xs) or xs!=sorted(set(xs)): raise ValueError('Transicoes invalidas')
        limites=[0,*xs,w]; roi=im[int(h*.12):int(h*.78)]
        desc=[]
        for a,b in zip(limites,limites[1:]):
            margem=int((b-a)*.08); desc.append(self.descritor(roi[:,a+margem:b-margem]))
        decisoes=[]; grupos=[0]
        for i,x in enumerate(xs):
            d=float(self.distancia(desc[i],desc[i+1])); manter=d>=self.limite
            decisoes.append({'x':x,'distancia':round(d,4),'decisao':'MANTER' if manter else 'UNIR','ambiguo':abs(d-self.limite)<.08})
            if manter: grupos.append(x)
        grupos.append(w)
        return {'grupos':[{'inicio':a,'fim':b,'inicio_relativo':a/w,'fim_relativo':b/w} for a,b in zip(grupos,grupos[1:])],'decisoes':decisoes}

def executar(origem,localizacao,saida,limite):
    dados=json.loads(localizacao.read_text()); saida.mkdir(parents=True,exist_ok=False); rel=[]
    for p in dados['prateleiras']:
        nome=p['arquivo']; im=cv2.imread(str(origem/Path(nome).name))
        if im is None or im.shape[1]!=p['largura']: raise ValueError('Imagem ausente ou largura incompatível: '+nome)
        r=AgrupadorProdutos(limite).agrupar(im,p['transicoes']); h,w=im.shape[:2]
        for d in r['decisoes']:
            x=d['x']; cor=(0,190,0) if d['decisao']=='MANTER' else (0,165,255)
            cv2.line(im,(x,0),(x,h-1),cor,2 if d['decisao']=='MANTER' else 1)
        for i,g in enumerate(r['grupos'],1): cv2.putText(im,str(i),(g['inicio']+4,20),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),2)
        if not cv2.imwrite(str(saida/Path(nome).name),im): raise IOError('Falha ao gravar')
        rel.append({'arquivo':nome,**r}); print(f'{nome}: {len(r["grupos"])} grupos candidatos')
    (saida/'agrupamento.json').write_text(json.dumps({'status':'EXPERIMENTAL_SEM_ASSOCIACAO_SKU','limite':limite,'prateleiras':rel},indent=2)); print('Resultados:',saida)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--origem',type=Path,required=True); p.add_argument('--localizacao',type=Path,required=True); p.add_argument('--limite',type=float,default=.42); a=p.parse_args(); executar(a.origem,a.localizacao,Path('resultados-agrupamento')/str(time.time_ns()),a.limite)
