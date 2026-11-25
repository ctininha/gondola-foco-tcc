import argparse,csv,json
from pathlib import Path
import cv2 as cv
import numpy as np
from visao_v031 import DetectorEspacos
from localizar_v041 import LocalizadorProdutos

class SegmentadorGondola:
    def detectar(self,img,n):
        h,w=img.shape[:2]; gray=cv.cvtColor(img,cv.COLOR_BGR2GRAY)
        score=(abs(cv.Sobel(gray,cv.CV_32F,0,1))>45).mean(axis=1)
        idx=np.where(score>.72)[0]; groups=np.split(idx,np.where(np.diff(idx)>12*h/1086)[0]+1)
        peaks=[int(a[np.argmax(score[a])]) for a in groups if len(a)]
        # Rails have paired horizontal edges; use lower edge as crop boundary.
        pairs=[b for a,b in zip(peaks,peaks[1:]) if .018*h<=b-a<=.045*h]
        candidates=[]
        for p in pairs:
            if .12*h<p<.92*h and (not candidates or p-candidates[-1]>.10*h): candidates.append(p)
        if len(candidates)!=n: raise ValueError(f'{len(candidates)} limites candidatos para {n} prateleiras; use ajuste manual')
        top=[p for p in peaks if .07*h<p<candidates[0]-.12*h]
        if not top: raise ValueError('Limite superior incerto; use ajuste manual')
        return [top[-1],*candidates]

def validar(im,b,n):
    if len(b)!=n+1 or any(not isinstance(x,int) for x in b) or b[0]<0 or b[-1]>im.shape[0] or any(y-x<40 for x,y in zip(b,b[1:])): raise ValueError('Limites inválidos')

def salvar(p,im):
    if not cv.imwrite(str(p),im): raise IOError(str(p))

def executar(ref,aud,plan,saida,manual=None):
    with open(plan,encoding='utf-8-sig',newline='') as f: ns=sorted({int(r['Prateleira']) for r in csv.DictReader(f,delimiter=';')})
    if not ns: raise ValueError('Planograma vazio')
    ims=[cv.imread(str(p)) for p in (ref,aud)]
    if any(im is None for im in ims): raise ValueError('Imagem ilegível')
    qualidade=[]
    for im in ims:
        g=cv.cvtColor(im,cv.COLOR_BGR2GRAY); q=dict(largura=im.shape[1],altura=im.shape[0],luminosidade=float(g.mean()),nitidez=float(cv.Laplacian(g,cv.CV_64F).var()))
        if min(g.shape)<400 or q['nitidez']<35 or not 35<q['luminosidade']<230: raise ValueError('Qualidade insuficiente; fotografe novamente')
        qualidade.append(q)
    bs=[manual[k] if manual else SegmentadorGondola().detectar(im,len(ns)) for k,im in zip(('referencia','auditada'),ims)]
    for im,b in zip(ims,bs): validar(im,b,len(ns))
    saida.mkdir(parents=True,exist_ok=False); ev=[]; loc=[]
    for k,im,b in zip(('referencia','auditada'),ims,bs):
        preview=im.copy()
        for y in b: cv.line(preview,(0,y),(im.shape[1]-1,y),(0,255,255),3)
        salvar(saida/f'limites-{k}.png',preview)
    for i,n in enumerate(ns):
        r,a=[im[b[i]:b[i+1]] for im,b in zip(ims,bs)]; r=cv.resize(r,(a.shape[1],a.shape[0])); salvar(saida/f'referencia-{n}.png',r); salvar(saida/f'auditada-{n}.png',a); salvar(saida/f'comparacao-{n}.png',np.vstack([r,a])); ev.append(dict(prateleira=n,lacunas=DetectorEspacos().detectar(r,a))); loc.append(dict(arquivo=f'referencia-{n}.png',largura=r.shape[1],transicoes=LocalizadorProdutos().localizar(r)))
    for name,data in [('evidencias.json',dict(versao='0.3.1',status='EXPERIMENTAL',registro_geometrico=False,segmentacao_automatica=manual is None,prateleiras=ev)),('localizacao.json',dict(status='EXPERIMENTAL_SEM_ASSOCIACAO_SKU',prateleiras=loc)),('preparacao.json',dict(limites=bs,qualidade=qualidade,modo='manual' if manual else 'automatico',prateleiras=ns))]: (saida/name).write_text(json.dumps(data,indent=2),encoding='utf8')
    print('Limites:',bs,'\nResultados:',saida)

if __name__=='__main__':
    p=argparse.ArgumentParser();
    for k in ('referencia','auditada','planograma','saida'): p.add_argument('--'+k,type=Path,required=True)
    p.add_argument('--limites',type=Path); a=p.parse_args()
    try: executar(a.referencia,a.auditada,a.planograma,a.saida,json.loads(a.limites.read_text()) if a.limites else None)
    except (ValueError,OSError,KeyError) as e: p.exit(2,f'Preparação interrompida: {e}\n')
