import argparse,json,math
from pathlib import Path
import cv2 as cv
import numpy as np

def agrupar(valores,tol):
    grupos=[]
    for v in sorted(valores):
        if grupos and v-grupos[-1][0]<=tol: grupos[-1].append(v)
        else: grupos.append([v])
    return [int(round(sum(g)/len(g))) for g in grupos]

def geometria(img):
    h,w=img.shape[:2]
    gray=cv.cvtColor(img,cv.COLOR_BGR2GRAY)
    edges=cv.Canny(cv.GaussianBlur(gray,(3,3),0),50,150)
    linhas=cv.HoughLinesP(edges,1,np.pi/180,threshold=20,minLineLength=max(12,int(min(h,w)*.25)),maxLineGap=8)
    xs=[];ys=[];vis=img.copy()
    for x1,y1,x2,y2 in ([] if linhas is None else linhas.reshape(-1, 4)):
        dx,dy=abs(int(x2)-int(x1)),abs(int(y2)-int(y1))
        if dy>=h*.40 and dx<=dy*.12 and w*.08<(x1+x2)/2<w*.92:
            xs.append((int(x1)+int(x2))/2);cv.line(vis,(x1,y1),(x2,y2),(0,220,0),2)
        elif dx>=w*.25 and dy<=dx*.12 and h*.12<(y1+y2)/2<h*.88:
            ys.append((int(y1)+int(y2))/2);cv.line(vis,(x1,y1),(x2,y2),(255,160,0),2)
    return {'linhas_verticais_x':agrupar(xs,max(4,w*.035)), 'linhas_horizontais_y':agrupar(ys,max(4,h*.035)), 'largura':w,'altura':h},vis

def avaliar(resposta,g):
    c=resposta.get('colunas'); a=resposta.get('unidades_por_coluna'); n=resposta.get('unidades')
    valido=resposta.get('seguro') is True and type(c) is int and c>0 and isinstance(a,list) and len(a)==c and all(type(x) is int and x>0 for x in a) and type(n) is int and sum(a)==n
    if not valido:return 'IA_INVALIDA'
    if len(g['linhas_verticais_x'])<c-1 or len(g['linhas_horizontais_y'])<max(a)-1:return 'EVIDENCIA_GEOMETRICA_INSUFICIENTE'
    return 'EVIDENCIA_GEOMETRICA_COMPATIVEL_NAO_CONFIRMADA'

def main():
    p=argparse.ArgumentParser();p.add_argument('--origem',type=Path,required=True);p.add_argument('--saida',type=Path,required=True);args=p.parse_args()
    rows=json.loads((args.origem/'contagem.json').read_text());args.saida.mkdir(parents=True,exist_ok=False);out=[]
    for row in rows:
        r={'sku':row['sku'],'produto':row['produto'],'status':'REVISAR','reducaoConfirmada':None}
        for tipo in ('referencia','auditada'):
            old=row[tipo];name=Path(old['arquivo']).name;img=cv.imread(str(args.origem/name))
            if img is None:raise ValueError('Recorte ausente: '+name)
            g,vis=geometria(img); dest='linhas-'+name
            if not cv.imwrite(str(args.saida/dest),vis):raise IOError(dest)
            r[tipo]={'quantidadeCandidata':old.get('quantidade'),'quantidadeConfirmada':None,'geometria':g,'avaliacao':avaliar(old.get('resposta') or {},g),'arquivo':dest}
        out.append(r);print(r['produto'],r['referencia']['avaliacao'],r['auditada']['avaliacao'])
    (args.saida/'validacao.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print('Resultados:',args.saida)
if __name__=='__main__':main()
