import unittest
from leitor_precos_v09 import pares
class TestGeometria(unittest.TestCase):
    def test_par(self):
        self.assertEqual(len(pares([(10,10,36,78),(53,12,17,40),(74,13,17,40)])),1)
    def test_sem_centavos(self):
        self.assertEqual(pares([(10,10,36,78),(53,12,17,40)]),[])
    def test_mesma_altura(self):
        self.assertEqual(pares([(10,10,36,78),(53,12,36,78),(94,13,36,78)]),[])
    def test_desalinhado(self):
        self.assertEqual(pares([(10,10,36,78),(53,80,17,40),(74,81,17,40)]),[])
if __name__=='__main__': unittest.main()
