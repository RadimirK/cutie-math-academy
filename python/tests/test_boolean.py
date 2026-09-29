import random
import unittest

from cutemath.boolean import (
    POST_CLASSES,
    depends_on,
    is_linear,
    is_monotone,
    is_self_dual,
    points,
    random_formula,
    to_tex,
    truth_vector,
    zhegalkin,
    zhegalkin_sympy,
    zhegalkin_tex,
)
from cutemath.checks import check

AND = (0, 0, 0, 1)
OR = (0, 1, 1, 1)
XOR = (0, 1, 1, 0)
IMP = (1, 1, 0, 1)
MAJ = (0, 0, 0, 1, 0, 1, 1, 1)


class ZhegalkinTest(unittest.TestCase):
    def test_known_polynomials(self):
        self.assertEqual(zhegalkin_tex(zhegalkin(OR, 2)), 'xy \\oplus x \\oplus y')
        self.assertEqual(zhegalkin_tex(zhegalkin(IMP, 2)), 'xy \\oplus x \\oplus 1')
        self.assertEqual(zhegalkin_tex(zhegalkin(MAJ, 3)), 'xy \\oplus xz \\oplus yz')
        self.assertEqual(zhegalkin_sympy(zhegalkin((1, 0), 1)), 'x + 1')

    def test_polynomial_reproduces_vector(self):
        rng = random.Random(1)
        for n in (1, 2, 3, 4):
            for _ in range(50):
                v = tuple(rng.randint(0, 1) for _ in range(2 ** n))
                ms = zhegalkin(v, n)
                back = tuple(sum(all(p[j] for j in m) for m in ms) % 2 for p in points(n))
                self.assertEqual(back, v)

    def test_checker_accepts_reordered_polynomial(self):
        self.assertEqual(check('expression', 'y + 1 + x*y', 'x*y + y + 1', {'variables': ['x', 'y']}), {'ok': True})
        self.assertEqual(check('expression', 'x*y + x', 'x*y + y + 1', {'variables': ['x', 'y']}), {'ok': False})


class PostClassesTest(unittest.TestCase):
    def classes(self, v, n):
        return {name for name, pred in POST_CLASSES if pred(v, n)}

    def test_classic_functions(self):
        self.assertEqual(self.classes(AND, 2), {'T_0', 'T_1', 'M'})
        self.assertEqual(self.classes(XOR, 2), {'T_0', 'L'})
        self.assertEqual(self.classes(IMP, 2), {'T_1'})
        self.assertEqual(self.classes(MAJ, 3), {'T_0', 'T_1', 'M', 'S'})
        self.assertEqual(self.classes((1, 0), 1), {'S', 'L'})
        self.assertEqual(self.classes((1, 1, 1, 0), 2), set())

    def test_depends_on(self):
        self.assertTrue(depends_on(XOR, 2, 0))
        self.assertFalse(depends_on((0, 0, 1, 1), 2, 1))

    def test_predicates(self):
        self.assertTrue(is_monotone(OR, 2))
        self.assertFalse(is_monotone(XOR, 2))
        self.assertTrue(is_self_dual((0, 1), 1))
        self.assertTrue(is_linear((1, 0, 0, 1), 2))


class FormulaTest(unittest.TestCase):
    def test_random_formula_uses_all_variables(self):
        rng = random.Random(7)
        for _ in range(30):
            f = random_formula(rng, 3, ['and', 'or', 'imp', 'xor'], 3)
            v = truth_vector(f, 3)
            self.assertTrue(all(depends_on(v, 3, j) for j in range(3)))
            for name in 'xyz':
                self.assertIn(name, to_tex(f))


if __name__ == '__main__':
    unittest.main()
