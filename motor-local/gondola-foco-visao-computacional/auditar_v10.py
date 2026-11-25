import argparse, csv, json, shutil, subprocess, sys, urllib.request
from pathlib import Path
from datetime import datetime

def main():
    p=argparse.ArgumentParser()
    for k in ('referencia','auditada','planograma','precos','saida'): p.add_argument('--'+k,type=Path,required=True)
    p.add_argument('--motor',type=Path,default=Path(__file__).resolve().parent.parent/'gondola-foco-prototipo-v045')
    p.add_argument('--replay',type=Path); p.add_argument('--sem-contagem',action='store_true'); p.add_argument('--etiqueta-isolada',type=Path)
    a=p.parse_args(); base=Path(__file__).resolve().parent
    for k in ('referencia','auditada','planograma','precos','saida','motor','replay','etiqueta_isolada'):
        v=getattr(a,k); setattr(a,k,v.resolve() if v else None)
    for f in (a.referencia,a.auditada,a.planograma,a.precos,a.motor/'rodar-v071.mjs',a.etiqueta_isolada):
        if f is not None and not f.is_file(): p.error(f'Arquivo ausente: {f}')
    for cmd in ('node','tesseract'):
        if not shutil.which(cmd): p.error(f'Dependencia ausente: {cmd}')
    import cv2, numpy
    with a.planograma.open(encoding='utf-8-sig') as f: shelves=sorted({int(r['Prateleira']) for r in csv.DictReader(f,delimiter=';')})
    if not shelves: p.error('Planograma vazio')
    if a.replay:
        if not a.sem_contagem: p.error('Replay exige --sem-contagem para nao misturar inferencias novas e antigas')
        for n in shelves:
            if not (a.replay/f'prateleira-{n}.json').is_file(): p.error(f'Replay incompleto: {n}')
    else:
        with urllib.request.urlopen('http://127.0.0.1:11434/api/tags',timeout=10) as f: models=json.load(f)['models']
        if not any(m['name']=='qwen3-vl:8b-instruct' for m in models): p.error('Modelo Ollama ausente')
    out=a.saida; out.mkdir(parents=True,exist_ok=False)
    status={'versao':'1.0','modo':'REPLAY' if a.replay else 'AO_VIVO','status':'EM_PROCESSAMENTO','etapas':[]}
    def save(): (out/'execucao.json').write_text(json.dumps(status,ensure_ascii=False,indent=2))
    def run(name,cmd,cwd=base):
        row={'etapa':name,'status':'EM_PROCESSAMENTO'};status['etapas'].append(row);save();print('\n>>> '+name,flush=True)
        try:
            subprocess.run([str(x) for x in cmd],cwd=cwd,check=True)
        except Exception as e:
            row.update(status='FALHA',erro=str(e));save();raise
        row['status']='CONCLUIDA';save()
    def py(name,script,*args): run(name,[sys.executable,base/script,*args])
    save()
    try:
        py('Preparacao','preparar_v05.py','--referencia',a.referencia,'--auditada',a.auditada,'--planograma',a.planograma,'--saida',out/'recortes')
        py('OCR amarelo','leitor_precos_v061.py','--origem',out/'recortes','--saida',out/'ocr')
        py('Ancoras','ancoras_v07.py','--origem',out/'recortes','--ocr',out/'ocr/precos-ocr.json','--saida',out/'ancoras')
        cmd=['node',a.motor/'rodar-v071.mjs',a.planograma,a.precos,out/'recortes',out/'ancoras/ocr.json',out/'ancoras/ancoras.json',out/'motor']
        if a.replay: cmd.append(a.replay)
        run('Motor V0.7.1',cmd,a.motor)
        if not a.sem_contagem:
            py('Contagem candidata','contagem_v08.py','--origem',out/'recortes','--relatorio',out/'motor/relatorio.json','--ancoras',out/'ancoras/ancoras.json','--ocr',out/'ancoras/ocr.json','--saida',out/'contagem','--prateleiras',*shelves)
            py('Geometria','validar_contagem_v081.py','--origem',out/'contagem','--saida',out/'geometria')
        if a.etiqueta_isolada: py('OCR digital isolado','leitor_precos_v09.py','--etiqueta-isolada',a.etiqueta_isolada,'--saida',out/'digital')
        report=json.loads((out/'motor/relatorio.json').read_text()); report['modoExecucao']=status['modo']; report['contagemConfirmada']=False
        counts={r['sku']:r for r in json.loads((out/'geometria/validacao.json').read_text())} if not a.sem_contagem else {}
        for i in report['items']:
            i['contagemComplementar']=counts.get(i['sku']); i['quantidadeConfirmada']=None;i['reducaoConfirmada']=None
        (out/'relatorio.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));status['status']='PENDENTE_CONFERENCIA';save();print('Relatorio:',out/'relatorio.json')
    except Exception as e:
        status.update(status='FALHA',erro=str(e));save();print('Interrompido. Resultados preservados em',out,file=sys.stderr);return 1
    return 0
if __name__=='__main__': sys.exit(main())
