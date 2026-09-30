import random
import unittest

from cutemath.boolean import (
    POST_CLASSES,
    closed_under,
    cnf_tex,
    depends_on,
    dual,
    essential_count,
    horn_least_model,
    is_forcible,
    is_symmetric,
    maj,
    minimal_ones,
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


class PropertiesTest(unittest.TestCase):
    def test_dual(self):
        self.assertEqual(dual(AND), OR)
        self.assertEqual(dual(XOR), (1, 0, 0, 1))
        self.assertEqual(dual(MAJ), MAJ)

    def test_forcible(self):
        self.assertTrue(is_forcible(AND, 2))
        self.assertFalse(is_forcible(XOR, 2))
        self.assertFalse(is_forcible((1, 0, 0, 1), 2))
        self.assertTrue(is_forcible(IMP, 2))

    def test_symmetric_and_essential(self):
        self.assertTrue(is_symmetric(MAJ, 3))
        self.assertFalse(is_symmetric(IMP, 2))
        self.assertEqual(essential_count((0, 0, 1, 1, 1, 1, 0, 0), 3), 2)

    def test_minimal_ones(self):
        self.assertEqual(minimal_ones(MAJ, 3), [(0, 1, 1), (1, 0, 1), (1, 1, 0)])

    def test_closures(self):
        # x ⊕ y = (x ∨ y)(¬x ∨ ¬y) is a 2-CNF but not Horn; x ⊕ y ⊕ z is neither.
        self.assertTrue(closed_under(AND, 2, lambda a, b: a & b))
        self.assertFalse(closed_under(XOR, 2, lambda a, b: a & b))
        self.assertTrue(closed_under(XOR, 2, maj))
        self.assertTrue(closed_under(IMP, 2, maj))
        self.assertFalse(closed_under((0, 1, 1, 0, 1, 0, 0, 1), 3, maj))

    def test_horn_least_model(self):
        # x ∧ (¬x ∨ y) ∧ (¬y ∨ z) ∧ (¬x ∨ ¬z) is unsatisfiable.
        clauses = [((0, True),), ((0, False), (1, True)), ((1, False), (2, True)), ((0, False), (2, False))]
        self.assertIsNone(horn_least_model(clauses, 3))
        self.assertEqual(horn_least_model(clauses[:3], 3), [1, 1, 1])
        self.assertEqual(cnf_tex(clauses[:2]), 'x \\wedge (\\neg x \\vee y)')


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
