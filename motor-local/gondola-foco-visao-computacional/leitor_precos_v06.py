import argparse, json, re, subprocess, shutil
from pathlib import Path
import cv2 as cv
import numpy as np

class LeitorPrecos:
    def localizar(self, img):
        h,w=img.shape[:2]
        hsv=cv.cvtColor(img,cv.COLOR_BGR2HSV)
        mask=cv.inRange(hsv,(15,90,100),(40,255,255))
        mask[:int(h*.78)]=0
        mask=cv.morphologyEx(mask,cv.MORPH_CLOSE,np.ones((3,9),np.uint8))
        return sorted([(int(x),int(y),int(a),int(b)) for x,y,a,b,area in cv.connectedComponentsWithStats(mask)[2][1:] if w*.025<a<w*.15 and b>h*.035 and 1.2<a/b<8 and area/(a*b)>.65])
    def ler(self, crop):
        h,w=crop.shape[:2]
        gray=cv.cvtColor(crop,cv.COLOR_BGR2GRAY)
        readings=[]
        for left in (.25,.35):
            roi=gray[int(h*.18):,int(w*left):]
            roi=cv.resize(roi,None,fx=5,fy=5,interpolation=cv.INTER_CUBIC)
            _,roi=cv.threshold(roi,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU)
            roi=cv.copyMakeBorder(roi,15,15,15,15,cv.BORDER_CONSTANT,value=255)
            ok,buf=cv.imencode('.png',roi)
            if not ok: raise IOError('Falha ao codificar etiqueta')
            p=subprocess.run(['tesseract','stdin','stdout','-l','eng','--psm','7','-c','tessedit_char_whitelist=0123456789,.'],input=buf.tobytes(),capture_output=True,timeout=20,check=True)
            readings.append(p.stdout.decode().strip())
        valid=[s.replace(',','.') for s in readings if re.fullmatch(r'\d{1,4}[,.]\d{2}',s)]
        price=float(valid[0]) if len(valid)==2 and len(set(valid))==1 else None
        return price,readings

def main():
    p=argparse.ArgumentParser();p.add_argument('--origem',type=Path,required=True);p.add_argument('--saida',type=Path,required=True);a=p.parse_args()
    if not shutil.which('tesseract'): raise SystemExit('Tesseract indisponivel')
    paths=sorted(a.origem.glob('auditada-*.png'))
    if not paths: raise SystemExit('Nenhum recorte auditado encontrado')
    a.saida.mkdir(parents=True,exist_ok=False); report=[]; reader=LeitorPrecos()
    for path in paths:
        img=cv.imread(str(path));
        if img is None: raise ValueError(f'Imagem invalida: {path}')
        n=int(path.stem.split('-')[-1]); labels=[]
        for i,(x,y,w,h) in enumerate(reader.localizar(img),1):
            crop=img[y:y+h,x:x+w]; price,raw=reader.ler(crop)
            name=f'etiqueta-{n}-{i}.png';cv.imwrite(str(a.saida/name),crop)
            labels.append(dict(x=x,y=y,largura=w,altura=h,preco=price,leituras=raw,arquivo=name,status='CANDIDATO' if price is not None else 'REVISAR'))
        report.append(dict(prateleira=n,etiquetas=labels));print(f'Prateleira {n}: '+str([e['preco'] for e in labels]))
    (a.saida/'precos-ocr.json').write_text(json.dumps(dict(status='EXPERIMENTAL',perfil='ETIQUETAS_AMARELAS',prateleiras=report),indent=2),encoding='utf8')
    print('Resultados:',a.saida)
if __name__=='__main__': main()
