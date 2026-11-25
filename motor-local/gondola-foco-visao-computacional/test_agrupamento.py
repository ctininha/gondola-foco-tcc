import unittest
import numpy as np
from agrupar_v042 import AgrupadorProdutos
class TestAgrupamento(unittest.TestCase):
    def test_repetidos(self):
        im=np.zeros((100,300,3),np.uint8); im[:,:200]=(20,40,200); im[:,200:]=(200,40,20)
        r=AgrupadorProdutos().agrupar(im,[{'x':80},{'x':200}]); self.assertEqual([g['fim'] for g in r['grupos']],[200,300])
    def test_uniforme(self):
        r=AgrupadorProdutos().agrupar(np.zeros((100,300,3),np.uint8),[{'x':100}]); self.assertEqual(len(r['grupos']),1)
    def test_invalido(self):
        with self.assertRaises(ValueError): AgrupadorProdutos().agrupar(np.zeros((100,300,3),np.uint8),[{'x':200},{'x':100}])
    def test_sem_transicoes(self):
        self.assertEqual(len(AgrupadorProdutos().agrupar(np.zeros((100,300,3),np.uint8),[])['grupos']),1)
