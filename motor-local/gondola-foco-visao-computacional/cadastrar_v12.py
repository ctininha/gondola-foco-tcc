import csv,json,sys
from pathlib import Path
import cv2 as cv
from preparar_v05 import SegmentadorGondola,validar,salvar
from leitor_precos_v06 import LeitorPrecos
from localizar_v041 import LocalizadorProdutos
folder=Path(sys.argv[1]); im=cv.imread(str(folder/'referencia.png'))
if im is None: raise ValueError('Imagem ilegível')
g=cv.cvtColor(im,cv.COLOR_BGR2GRAY)
if min(g.shape)<400 or cv.Laplacian(g,cv.CV_64F).var()<35 or not 35<g.mean()<230: raise ValueError('Qualidade insuficiente')
with (folder/'plan.csv').open(encoding='utf-8-sig') as f: ns=sorted({int(r['Prateleira']) for r in csv.DictReader(f,delimiter=';')})
b=SegmentadorGondola().detectar(im,len(ns)); validar(im,b,len(ns)); rows=[]
for i,n in enumerate(ns):
    r=im[b[i]:b[i+1]]; name=f'referencia-{n}.png'; salvar(folder/name,r)
    rows.append(dict(prateleira=n,arquivo=name,largura=r.shape[1],altura=r.shape[0],etiquetas=[dict(x=int(x),y=int(y),largura=int(w),altura=int(h)) for x,y,w,h in LeitorPrecos().localizar(r)],transicoes=LocalizadorProdutos().localizar(r)))
(folder/'geometria.json').write_text(json.dumps(dict(limites=b,prateleiras=rows),ensure_ascii=False,indent=2))
