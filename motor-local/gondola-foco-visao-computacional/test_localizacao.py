import unittest
import numpy as np
from localizar_v041 import LocalizadorProdutos
class TestLocalizacao(unittest.TestCase):
    def test_uniforme(self):
        self.assertEqual(LocalizadorProdutos().localizar(np.full((100,600,3),120,np.uint8)),[])
    def test_larguras_diferentes(self):
        im=np.zeros((100,600,3),np.uint8); im[:,:100]=(20,30,200); im[:,100:370]=(200,30,20); im[:,370:]=(30,200,20)
        p=LocalizadorProdutos().localizar(im)
        for x in (100,370): self.assertTrue(any(abs(r['x']-x)<15 for r in p))
    def test_pequeno(self):
        with self.assertRaises(ValueError): LocalizadorProdutos().localizar(np.zeros((10,20,3),np.uint8))
if __name__=='__main__': unittest.main()
