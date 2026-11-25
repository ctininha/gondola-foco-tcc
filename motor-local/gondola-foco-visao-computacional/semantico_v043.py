import argparse, base64, json, time, urllib.request
from pathlib import Path
import cv2

class AgrupadorSemantico:
    def __init__(self, consultar): self.consultar = consultar
    def avaliar(self, imagem, xs):
        h,w=imagem.shape[:2]
        if xs != sorted(set(xs)) or any(type(x) is not int or not 0<x<w for x in xs): raise ValueError('Coordenadas inválidas')
        limites=[0,*xs,w]; resultados=[]
        for i,x in enumerate(xs,1):
            a=imagem[:int(h*.78),limites[i-1]:x]; b=imagem[:int(h*.78),x:limites[i+1]]
            try:
                r=self.consultar(a,b)
                if not isinstance(r,dict) or r.get('decisao') not in ('UNIR','SEPARAR','REVISAR') or not all(isinstance(r.get(k),str) and r[k].strip() for k in ('esquerda','direita','motivo')): raise ValueError('Resposta inválida')
                if r['decisao']=='UNIR' and r['esquerda'].casefold().strip()!=r['direita'].casefold().strip(): r['decisao']='REVISAR'
                if r['decisao']=='SEPARAR' and r['esquerda'].casefold().strip()==r['direita'].casefold().strip(): r['decisao']='REVISAR'
            except Exception as e: r={'decisao':'REVISAR','erro':str(e)}
            resultados.append({'x':x,**r}); print(f'  x={x}: {r["decisao"]}',flush=True)
        return resultados

def ollama(a,b):
    def encode(im):
        ok,buf=cv2.imencode('.png',im)
        if not ok: raise ValueError('Recorte inválido')
        return base64.b64encode(buf).decode()
    prompt='Compare duas imagens de embalagens vizinhas: primeira esquerda, segunda direita. Identifique marca e tipo de produto em cada uma pelo texto visível. Não use apenas cor. Se recorte parcial, múltiplos produtos, texto ilegível ou dúvida, REVISAR. UNIR somente se mesma identidade; SEPARAR somente se identidades distintas legíveis. Retorne apenas JSON com esquerda, direita, motivo (strings curtas) e decisao (UNIR, SEPARAR ou REVISAR).'
    payload={'model':'qwen3-vl:8b-instruct','messages':[{'role':'user','content':prompt,'images':[encode(a),encode(b)]}],'stream':True,'format':'json','options':{'temperature':0,'num_ctx':8192,'num_predict':350}}
    req=urllib.request.Request('http://localhost:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    parts=[]; done=False
    with urllib.request.urlopen(req,timeout=180) as res:
        for line in res:
            obj=json.loads(line); parts.append(obj.get('message',{}).get('content',''))
            if obj.get('error'): raise RuntimeError(obj['error'])
            if obj.get('done'): done=True; break
    if not done: raise ValueError('Resposta incompleta')
    return json.loads(''.join(parts))

def main():
    p=argparse.ArgumentParser(); p.add_argument('--origem',required=True); p.add_argument('--localizacao',required=True); p.add_argument('--prateleira',type=int); args=p.parse_args()
    data=json.loads(Path(args.localizacao).read_text()); out=Path('resultados-semanticos')/str(time.time_ns()); out.mkdir(parents=True)
    report={'status':'EXPERIMENTAL_SEM_ASSOCIACAO_SKU','prateleiras':[]}; motor=AgrupadorSemantico(ollama)
    for n,s in enumerate(data['prateleiras'],1):
        if args.prateleira and n!=args.prateleira: continue
        name=s['arquivo']; im=cv2.imread(str(Path(args.origem)/Path(name).name))
        if im is None or im.shape[1]!=s['largura']: raise ValueError('Imagem incompatível: '+name)
        print(name,flush=True); decisions=motor.avaliar(im,[t['x'] for t in s['transicoes']]); report['prateleiras'].append({'arquivo':name,'decisoes':decisions})
        (out/'semantico.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        for d in decisions:
            c={'UNIR':(0,180,255),'SEPARAR':(0,200,0),'REVISAR':(0,0,255)}[d['decisao']]; x=d['x']; cv2.line(im,(x,0),(x,im.shape[0]-1),c,2); cv2.putText(im,d['decisao'][0],(x+3,20),cv2.FONT_HERSHEY_SIMPLEX,.5,c,2)
        cv2.imwrite(str(out/name),im)
    print('Resultados:',out)
if __name__=='__main__': main()
