import argparse, base64, hashlib, json, time, urllib.request, unicodedata
from pathlib import Path
import cv2

FIELDS=('esquerda','direita','motivo','decisao')
SCHEMA={'type':'object','properties':{k:{'type':'string'} for k in FIELDS},'required':list(FIELDS),'additionalProperties':False}
SCHEMA['properties']['decisao']['enum']=['UNIR','SEPARAR','REVISAR']
PROMPT='Compare os produtos imediatamente à esquerda e à direita da divisão central da imagem. Use o contexto para ler as embalagens, mas não confunda produtos mais distantes com os vizinhos da divisão. Identifique marca, tipo e variante visíveis de cada lado. Não invente. UNIR se mesma identidade, SEPARAR se diferentes, REVISAR se dúvida. Retorne esquerda, direita, motivo e decisao em JSON.'

def norm(s):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c)).split())

class PreparadorRecortes:
    def preparar(self, im, x, anterior, seguinte):
        h,w=im.shape[:2]; raio=max(h, x-anterior, seguinte-x)
        a,b=max(0,x-raio),min(w,x+raio)
        # Contexto simétrico com marcador acima, sem pintar embalagens.
        crop=cv2.copyMakeBorder(im[:,a:b],24,0,0,0,cv2.BORDER_CONSTANT,value=(245,245,245))
        cv2.arrowedLine(crop,(x-a,1),(x-a,22),(0,0,255),2,tipLength=.4)
        return crop, [a,b]

class ValidadorResposta:
    def validar(self, raw):
        r=json.loads(raw)
        if not isinstance(r,dict) or any(not isinstance(r.get(k),str) or not r[k].strip() for k in FIELDS) or r['decisao'] not in SCHEMA['properties']['decisao']['enum']:
            raise ValueError('Campos obrigatórios ou decisão inválidos')
        r={k:r[k] for k in FIELDS}; a,b=norm(r['esquerda']),norm(r['direita'])
        if a in ('revisar','desconhecido','ilegivel') or b in ('revisar','desconhecido','ilegivel') or (r['decisao']=='UNIR' and a!=b) or (r['decisao']=='SEPARAR' and a==b):
            r['decisao']='REVISAR'; r['aviso']='Identidades insuficientes ou inconsistentes; sem equivalência automática de nomes'
        return r

class ConsolidadorEvidencias:
    def combinar(self, visual, semantico):
        v={'MANTER':'SEPARAR','UNIR':'UNIR'}.get(visual)
        s=semantico
        return {'visual':v,'semantico':s,'situacao':'CONCORDANCIA' if v==s and v else 'CONFLITO' if v and s in ('UNIR','SEPARAR') else 'INSUFICIENTE','decisao':'REVISAR' if not v or v!=s else s}

class ProvedorOllama:
    def consultar(self, crop, diagnostico):
        ok,buf=cv2.imencode('.png',crop)
        if not ok: raise ValueError('Falha ao codificar imagem')
        payload={'model':'qwen3-vl:8b-instruct','messages':[{'role':'user','content':PROMPT,'images':[base64.b64encode(buf).decode()]}],'stream':True,'format':SCHEMA,'options':{'temperature':0,'num_ctx':8192,'num_predict':512}}
        req=urllib.request.Request('http://localhost:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
        diagnostico['resposta_bruta']=''; done=False
        with urllib.request.urlopen(req,timeout=180) as res:
            for line in res:
                obj=json.loads(line)
                if obj.get('error'): raise RuntimeError(obj['error'])
                diagnostico['resposta_bruta']+=obj.get('message',{}).get('content','')
                if obj.get('done'):
                    done=True; diagnostico['done_reason']=obj.get('done_reason'); break
        if not done or diagnostico.get('done_reason')=='length': raise ValueError('Resposta incompleta ou truncada')
        return diagnostico['resposta_bruta']

class AgrupadorSemantico:
    def __init__(self, provedor=None):
        self.provedor=provedor or ProvedorOllama(); self.preparador=PreparadorRecortes(); self.validador=ValidadorResposta(); self.consolidador=ConsolidadorEvidencias()
    def avaliar(self, im, xs, anteriores, visuais, out):
        if xs!=sorted(set(xs)) or any(type(x)!=int or not 0<x<im.shape[1] for x in xs): raise ValueError('Coordenadas inválidas')
        limites=[0,*xs,im.shape[1]]; resultados=[]
        for i,x in enumerate(xs,1):
            d={'x':x}; t=time.monotonic(); old=anteriores.get(x,{})
            if old.get('decisao') in ('UNIR','SEPARAR'):
                r=dict(old); d['origem']='REUSO_V043_NAO_VERIFICADO_POR_HASH'
            else:
                d['origem']='V044'; crop,intervalo=self.preparador.preparar(im,x,limites[i-1],limites[i+1]); d['intervalo_recorte']=intervalo
                cv2.imwrite(str(out/f'recorte-{x}.png'),crop)
                try: r=self.validador.validar(self.provedor.consultar(crop,d))
                except Exception as e: r={'decisao':'REVISAR','erro':str(e)}
            d.update(r); d['segundos']=round(time.monotonic()-t,3); d['consolidacao']=self.consolidador.combinar(visuais.get(x),d['decisao']); resultados.append(d)
            print(f"x={x}: {d['decisao']} / {d['consolidacao']['situacao']} ({d['segundos']}s)",flush=True)
            (out/'parcial.json').write_text(json.dumps(resultados,ensure_ascii=False,indent=2))
        return resultados

def main():
    p=argparse.ArgumentParser();
    for k in ('origem','localizacao','agrupamento','anterior'): p.add_argument('--'+k,required=True)
    p.add_argument('--prateleira',type=int,default=2); args=p.parse_args()
    def load(path): return json.loads(Path(path).read_text())['prateleiras']
    loc=load(args.localizacao)[args.prateleira-1]; name=loc['arquivo']; path=Path(args.origem)/Path(name).name; im=cv2.imread(str(path))
    if im is None or im.shape[1]!=loc['largura']: raise ValueError('Imagem incompatível')
    def decisions(path): return {d['x']:d for s in load(path) if s['arquivo']==name for d in s['decisoes']}
    out=Path('resultados-semanticos-v044')/str(time.time_ns()); out.mkdir(parents=True)
    rows=AgrupadorSemantico().avaliar(im,[t['x'] for t in loc['transicoes']],decisions(args.anterior),{x:d['decisao'] for x,d in decisions(args.agrupamento).items()},out)
    report={'status':'EXPERIMENTAL','sha256_imagem':hashlib.sha256(path.read_bytes()).hexdigest(),'prateleiras':[{'arquivo':name,'decisoes':rows}]}
    (out/'semantico.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)); print('Resultados:',out)
if __name__=='__main__': main()
