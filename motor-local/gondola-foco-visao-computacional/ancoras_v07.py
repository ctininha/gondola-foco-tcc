import argparse,json
from pathlib import Path
import cv2 as cv
from leitor_precos_v06 import LeitorPrecos
from leitor_precos_v061 import ler
p=argparse.ArgumentParser();p.add_argument('--origem',type=Path,required=True);p.add_argument('--ocr',type=Path,required=True);p.add_argument('--saida',type=Path,required=True);a=p.parse_args()
report=json.loads(a.ocr.read_text()); refs=[]
for shelf in report['prateleiras']:
 n=shelf['prateleira']; r=cv.imread(str(a.origem/f'referencia-{n}.png')); im=cv.imread(str(a.origem/f'auditada-{n}.png'))
 if r is None or im is None: raise ValueError(f'Recorte ausente: {n}')
 shelf['largura']=im.shape[1]; labels=[dict(x=x,y=y,largura=w,altura=h) for x,y,w,h in LeitorPrecos().localizar(r)]
 refs.append(dict(prateleira=n,largura=r.shape[1],etiquetas=labels));print(n,len(labels),'âncoras')
a.saida.mkdir(parents=True,exist_ok=False)
for name,obj in [('ocr.json',report),('ancoras.json',dict(prateleiras=refs))]: (a.saida/name).write_text(json.dumps(obj,indent=2))
