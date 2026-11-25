"""OCR experimental: preserva V0.6 e testa recortes mais largos."""
import argparse, json, re, subprocess, shutil
from pathlib import Path
import cv2 as cv
import numpy as np
from leitor_precos_v06 import LeitorPrecos as Base

def ocr(gray, psm=7):
    scale=max(1,min(5,180/gray.shape[0]))
    gray=cv.resize(gray,None,fx=scale,fy=scale,interpolation=cv.INTER_CUBIC)
    _,gray=cv.threshold(gray,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU)
    if np.median(gray)<128: gray=255-gray
    gray=cv.copyMakeBorder(gray,15,15,15,15,cv.BORDER_CONSTANT,value=255)
    ok,buf=cv.imencode('.png',gray)
    if not ok: raise IOError('Falha na imagem')
    p=subprocess.run(['tesseract','stdin','stdout','-l','eng','--psm',str(psm),'-c','tessedit_char_whitelist=0123456789,.'],input=buf.tobytes(),capture_output=True,timeout=20,check=True)
    return p.stdout.decode().strip()

def parse(s):
    return s.replace(',','.') if re.fullmatch(r'\d{1,4}[,.]\d{2}',s) else None

def ler(crop):
    old,raw=Base().ler(crop)
    g=cv.cvtColor(crop,cv.COLOR_BGR2GRAY); h,w=g.shape
    extra=[ocr(g[int(h*.18):,int(w*x):]) for x in (.15,.20,.25)]
    vals=[parse(s) for s in extra]
    # Recortes largos devem concordar; conflito com leitura anterior aceita exige revisão.
    candidate=vals[0] if vals[0] and len(set(vals))==1 else None
    if old is not None:
        price=old if not any(v and float(v)!=old for v in vals) else None
    else:
        price=float(candidate) if candidate and parse(raw[0])==candidate else None
    return price,raw,extra

def digital(img):
    # Somente leitura de etiqueta isolada; sem inferir separador ausente.
    g=cv.cvtColor(img,cv.COLOR_BGR2GRAY)
    readings=[ocr(g,psm) for psm in (6,7,11)]
    vals=[parse(s) for s in readings]
    price=float(vals[0]) if vals[0] and len(set(vals))==1 else None
    return dict(preco=price,leituras=readings,status='CANDIDATO' if price is not None else 'REVISAR',observacao='Centavos separados exigem validacao geometrica; nao concatenados automaticamente')

def main():
    p=argparse.ArgumentParser(); p.add_argument('--origem',type=Path,required=True);p.add_argument('--saida',type=Path,required=True);p.add_argument('--etiqueta-isolada',type=Path);a=p.parse_args()
    if not shutil.which('tesseract'): raise SystemExit('Tesseract indisponivel')
    paths=sorted(a.origem.glob('auditada-*.png'))
    if not paths: raise SystemExit('Nenhum recorte auditado encontrado')
    a.saida.mkdir(parents=True,exist_ok=False); report=[]
    for path in paths:
        img=cv.imread(str(path)); n=int(path.stem.split('-')[-1]); labels=[]
        if img is None: raise ValueError(str(path))
        for i,(x,y,w,h) in enumerate(Base().localizar(img),1):
            crop=img[y:y+h,x:x+w]; price,raw,extra=ler(crop); name=f'etiqueta-{n}-{i}.png';cv.imwrite(str(a.saida/name),crop)
            labels.append(dict(x=x,y=y,largura=w,altura=h,preco=price,leituras=raw,leituras_ampliadas=extra,arquivo=name,status='CANDIDATO' if price is not None else 'REVISAR'))
        report.append(dict(prateleira=n,etiquetas=labels)); print(f'Prateleira {n}: {[e["preco"] for e in labels]}')
    result=dict(status='EXPERIMENTAL',perfil='AMARELAS_COM_RECORTE_AMPLIADO',prateleiras=report)
    if a.etiqueta_isolada:
        img=cv.imread(str(a.etiqueta_isolada))
        if img is None: raise ValueError('Etiqueta isolada invalida')
        result['etiqueta_isolada']=digital(img); print('Etiqueta isolada:',result['etiqueta_isolada'])
    (a.saida/'precos-ocr.json').write_text(json.dumps(result,indent=2),encoding='utf8');print('Resultados:',a.saida)
if __name__=='__main__': main()
