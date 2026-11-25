import unittest
import numpy as np
from semantico_v043 import AgrupadorSemantico
class TestSemantico(unittest.TestCase):
    def setUp(self): self.im=np.zeros((100,200,3),np.uint8)
    def test_unir(self):
        r=AgrupadorSemantico(lambda a,b:dict(esquerda='A',direita='A',motivo='texto',decisao='UNIR')).avaliar(self.im,[100]); self.assertEqual(r[0]['decisao'],'UNIR')
    def test_contradicao(self):
        r=AgrupadorSemantico(lambda a,b:dict(esquerda='A',direita='B',motivo='texto',decisao='UNIR')).avaliar(self.im,[100]); self.assertEqual(r[0]['decisao'],'REVISAR')
    def test_invalido(self):
        self.assertEqual(AgrupadorSemantico(lambda a,b:{}).avaliar(self.im,[100])[0]['decisao'],'REVISAR')
    def test_coordenadas(self):
        with self.assertRaises(ValueError): AgrupadorSemantico(None).avaliar(self.im,[200])
    def test_todas(self):
        self.assertEqual(len(AgrupadorSemantico(lambda a,b:{}).avaliar(self.im,[50,100,150])),3)
