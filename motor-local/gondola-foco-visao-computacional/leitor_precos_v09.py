"""OCR complementar; preços separados são sugestões, nunca confirmação."""
import argparse,json
from pathlib import Path
import cv2 as cv
import numpy as np
from leitor_precos_v061 import ocr,parse

def pares(boxes):
    out=[]
    for x,y,w,h in boxes:
        small=sorted((a,b,c,d) for a,b,c,d in boxes if 0.38*h<=d<=0.72*h and 0<=a-x-w<=0.65*h and abs(b-y)<=0.18*h)
        for l,r in zip(small,small[1:]):
            if 0<=r[0]-l[0]-l[2]<=0.22*h and abs(l[3]-r[3])<=0.15*h:
                out.append(((x,y,w,h),(l[0],min(l[1],r[1]),r[0]+r[2]-l[0],max(l[1]+l[3],r[1]+r[3])-min(l[1],r[1]))))
    return out

def digital(img):
    g=cv.cvtColor(img,cv.COLOR_BGR2GRAY); H,W=g.shape
    _,mask=cv.threshold(g,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU)
    results=[]
    for m in (mask,255-mask):
        boxes=[tuple(map(int,s[:4])) for s in cv.connectedComponentsWithStats(m)[2][1:] if .035*H<=s[3]<=.5*H and .08<=s[2]/s[3]<=1.2 and .12<=s[4]/(s[2]*s[3])<=.9]
        for pair in pares(boxes):
            texts=[]
            for x,y,w,h in pair:
                pad=max(2,round(h*.04)); roi=g[max(0,y-pad):min(H,y+h+pad),max(0,x-pad):min(W,x+w+pad)]; texts.append([ocr(roi,p) for p in (7,8)])
            if all(len(set(t))==1 for t in texts) and texts[0][0].isdigit() and len(texts[0][0])==1 and texts[1][0].isdigit() and len(texts[1][0])==2:
                results.append(dict(valor=float(texts[0][0]+'.'+texts[1][0]),caixas=pair,leituras=texts))
    values={r['valor'] for r in results}
    return dict(preco=None,sugestao=next(iter(values)) if len(values)==1 else None,status='REVISAR',evidencias=results)

def main():
    p=argparse.ArgumentParser();p.add_argument('--etiqueta-isolada',type=Path,required=True);p.add_argument('--saida',type=Path,required=True);a=p.parse_args();img=cv.imread(str(a.etiqueta_isolada))
    if img is None: raise SystemExit('Imagem invalida')
    r=digital(img);a.saida.mkdir(parents=True,exist_ok=False);(a.saida/'digital.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,ensure_ascii=False))
if __name__=='__main__':main()
