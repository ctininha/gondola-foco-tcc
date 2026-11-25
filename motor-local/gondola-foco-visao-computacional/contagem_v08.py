import argparse,json,base64,urllib.request
from pathlib import Path
import cv2

def recorte(img, etiqueta, vizinhas):
    h,w=img.shape[:2]; c=etiqueta['x']+etiqueta['largura']/2
    cs=sorted(e['x']+e['largura']/2 for e in vizinhas)
    if cs.count(c)!=1: raise ValueError('Âncora ambígua')
    k=cs.index(c); l=(cs[k-1]+c)/2 if k else max(0,c-(cs[1]-c)/2) if len(cs)>1 else 0
    r=(cs[k+1]+c)/2 if k+1<len(cs) else min(w,c+(c-cs[k-1])/2) if k else w
    y=min(h,int(etiqueta['y'])); return img[:y,max(0,int(l)):min(w,int(r))]

def validar(d):
    if not isinstance(d,dict) or d.get('seguro') is not True: return None
    n=d.get('unidades'); cols=d.get('colunas'); alturas=d.get('unidades_por_coluna')
    if type(n)!=int or type(cols)!=int or not isinstance(alturas,list) or not 1<=cols<=30 or len(alturas)!=cols or any(type(x)!=int or not 1<=x<=30 for x in alturas) or sum(alturas)!=n: return None
    return n

def consultar(img,nome):
    ok,b=cv2.imencode('.png',img)
    if not ok: raise ValueError('Recorte inválido')
    prompt=f'Conte exclusivamente embalagens frontais visíveis do produto {nome}. Ignore vizinhos, profundidade e fragmentos ambíguos. Conte cada embalagem empilhada separadamente. Se o recorte cortar o grupo ou a identidade/contagem for incerta, seguro=false. JSON apenas: {{"seguro":true,"colunas":2,"unidades_por_coluna":[1,1],"unidades":2}}. Os números do exemplo são ilustrativos, não copie.'
    payload={'model':'qwen3-vl:8b-instruct','stream':False,'format':'json','options':{'temperature':0,'num_ctx':4096,'num_predict':256},'messages':[{'role':'user','content':prompt,'images':[base64.b64encode(b).decode()]}]}
    req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=180) as f: d=json.load(f)
    if d.get('done_reason')!='stop': raise ValueError('Resposta incompleta')
    return json.loads(d['message']['content'])

def main():
    p=argparse.ArgumentParser();
    for k in ['origem','relatorio','ancoras','ocr','saida']: p.add_argument('--'+k,type=Path,required=True)
    p.add_argument('--prateleiras',type=int,nargs='+',default=[1,2]); p.add_argument('--somente-recortes',action='store_true'); a=p.parse_args()
    read=lambda p:json.loads(p.read_text()); items=read(a.relatorio)['items']; ref=read(a.ancoras)['prateleiras']; aud=read(a.ocr)['prateleiras']; a.saida.mkdir(parents=True,exist_ok=False); results=[]
    for n in a.prateleiras:
        group=sorted([i for i in items if i['shelf']==n],key=lambda i:i['position']); rr=next(p for p in ref if p['prateleira']==n)['etiquetas']; aa=next(p for p in aud if p['prateleira']==n)['etiquetas']; rr=sorted(rr,key=lambda e:e['x'])
        if len(group)!=len(rr): raise ValueError('Referência sem correspondência')
        for i,e in zip(group,rr):
            if i['candidateState']!='P' or not i.get('evidenciaPreco'): continue
            row={'sku':i['sku'],'produto':i['name'],'prateleira':n,'status':'REVISAR'}
            for tipo,anchor,all_e in [('referencia',e,rr),('auditada',i['evidenciaPreco'],aa)]:
                img=cv2.imread(str(a.origem/f'{tipo}-{n}.png')); crop=recorte(img,anchor,all_e); name=f'{i["sku"]}-{tipo}.png'; cv2.imwrite(str(a.saida/name),crop); row[tipo]={'arquivo':name,'quantidade':None}
                if not a.somente_recortes:
                    try:
                        d=consultar(crop,i['name']); row[tipo].update(quantidade=validar(d),resposta=d)
                    except Exception as exc: row[tipo]['erro']=str(exc)
            results.append(row); print(i['name'],row['referencia']['quantidade'],row['auditada']['quantidade'],flush=True); (a.saida/'contagem.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('Resultados:',a.saida)
if __name__=='__main__': main()
