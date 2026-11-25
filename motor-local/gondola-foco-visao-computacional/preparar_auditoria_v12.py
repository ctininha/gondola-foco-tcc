import json,sys
from pathlib import Path
import cv2 as cv
from preparar_v05 import SegmentadorGondola,validar,salvar
from visao_v031 import DetectorEspacos
folder,photo,out=map(Path,sys.argv[1:]); row=json.loads((folder/'cadastro.json').read_text()); refs=row['geometria']['prateleiras']; im=cv.imread(str(photo))
if im is None: raise ValueError('Imagem ilegível')
g=cv.cvtColor(im,cv.COLOR_BGR2GRAY)
if min(g.shape)<400 or cv.Laplacian(g,cv.CV_64F).var()<35 or not 35<g.mean()<230: raise ValueError('Qualidade insuficiente')
b=SegmentadorGondola().detectar(im,len(refs)); validar(im,b,len(refs)); out.mkdir(); ev=[]
for i,r in enumerate(refs):
 n=r['prateleira']; a=im[b[i]:b[i+1]]; ref=cv.imread(str(folder/f'referencia-{n}.png'))
 if ref is None: raise ValueError('Referência ausente')
 salvar(out/f'auditada-{n}.png',a); ev.append(dict(prateleira=n,lacunas=DetectorEspacos().detectar(cv.resize(ref,(a.shape[1],a.shape[0])),a)))
(out/'evidencias.json').write_text(json.dumps(dict(prateleiras=ev)))
