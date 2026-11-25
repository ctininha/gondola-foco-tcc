import unittest,json,tempfile
from pathlib import Path
import numpy as np
from semantico_v044 import *
class Test(unittest.TestCase):
 def test_recorte(self):
  im=np.zeros((100,300,3),np.uint8); crop,span=PreparadorRecortes().preparar(im,150,140,160); self.assertEqual(span,[50,250]); self.assertEqual(crop.shape,(124,200,3))
 def test_json(self):
  with self.assertRaises(ValueError): ValidadorResposta().validar('{}')
 def test_contradicao(self):
  r=dict(esquerda='A',direita='B',motivo='teste',decisao='UNIR'); self.assertEqual(ValidadorResposta().validar(json.dumps(r))['decisao'],'REVISAR')
 def test_conflito(self): self.assertEqual(ConsolidadorEvidencias().combinar('UNIR','SEPARAR')['decisao'],'REVISAR')
 def test_reuso_e_erro(self):
  class P:
   def consultar(self,c,d): d['resposta_bruta']='{'; return '{'
  with tempfile.TemporaryDirectory() as t:
   r=AgrupadorSemantico(P()).avaliar(np.zeros((100,300,3),np.uint8),[100,200],{100:{'decisao':'SEPARAR'}},{100:'MANTER'},Path(t)); self.assertEqual(r[0]['decisao'],'SEPARAR'); self.assertEqual(r[1]['resposta_bruta'],'{'); self.assertEqual(r[1]['decisao'],'REVISAR')
