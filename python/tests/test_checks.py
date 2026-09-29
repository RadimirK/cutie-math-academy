import unittest

from cutemath.checks import check, wrong
from cutemath.generate import run_generator


class ExpressionTest(unittest.TestCase):
    def test_equivalent_forms(self):
        self.assertEqual(check('expression', 'exp(2*x)*exp(x)', 'exp(3*x)'), {'ok': True})
        self.assertEqual(check('expression', 'sin(x)**2 + cos(x)**2', '1', {'variables': ['x']}), {'ok': True})
        self.assertEqual(check('expression', 'ln(x**2)/2', 'log(x)'), {'ok': True})

    def test_different(self):
        self.assertEqual(check('expression', 'exp(3*x) + 1e-6', 'exp(3*x)'), {'ok': False})
        self.assertEqual(check('expression', 'x**2', 'x**3'), {'ok': False})

    def test_extra_variable_is_parse_error(self):
        self.assertIn('parseError', check('expression', 'x*y', 'x', {'variables': ['x']}))

    def test_garbage_is_parse_error(self):
        self.assertIn('parseError', check('expression', 'exp(', 'x'))
        self.assertIn('parseError', check('expression', '', 'x'))

    def test_real_domain(self):
        self.assertEqual(check('expression', 'Abs(x)', 'x'), {'ok': False})
        self.assertEqual(check('expression', 'sqrt(x**2)', 'Abs(x)'), {'ok': True})

    def test_stages(self):
        self.assertEqual(check('expression', 'x + x', '2*x', stage='numeric'), {'ok': True})
        self.assertEqual(check('expression', 'x', '2*x', stage='numeric'), {'ok': False})
        # sqrt(-1 - x**2) is never real, so the numeric stage cannot decide.
        r = check('expression', 'sqrt(-1 - x**2)', 'I*sqrt(1 + x**2)', stage='numeric')
        self.assertEqual(r, {'ok': False, 'needsSymbolic': True})
        self.assertEqual(check('expression', 'sqrt(-1 - x**2)', 'I*sqrt(1 + x**2)', stage='symbolic'), {'ok': True})


class NumberTest(unittest.TestCase):
    def test_exact(self):
        self.assertEqual(check('number', '0.5', '1/2'), {'ok': True})
        self.assertEqual(check('number', 'sqrt(8)', '2*sqrt(2)'), {'ok': True})
        self.assertEqual(check('number', 'e**6', 'exp(6)'), {'ok': True})
        self.assertEqual(check('number', '0.333', '1/3'), {'ok': False})

    def test_special(self):
        self.assertEqual(check('number', 'oo', 'oo'), {'ok': True})
        self.assertEqual(check('number', '-oo', 'oo'), {'ok': False})
        self.assertEqual(check('number', 'DNE', 'DNE'), {'ok': True})
        self.assertEqual(check('number', '0', 'DNE'), {'ok': False})
        self.assertEqual(check('number', 'oo*3/2', 'oo'), {'ok': True})

    def test_variables_rejected(self):
        self.assertIn('parseError', check('number', 'x', '1'))


class MatrixTest(unittest.TestCase):
    def test_matrix(self):
        self.assertEqual(check('matrix', '[[1, 0.5], [0, 1]]', '[[1, 1/2], [0, 1]]'), {'ok': True})
        self.assertEqual(check('matrix', '[[1, 0], [0, 1]]', '[[1, 0, 0], [0, 1, 0]]'), {'ok': False})
        self.assertIn('parseError', check('matrix', '[[1, 0], [0]]', '[[1, 0], [0, 1]]'))

    def test_wrong(self):
        self.assertEqual(check('matrix', wrong('matrix', '[[1, 2], [3, 4]]'), '[[1, 2], [3, 4]]'), {'ok': False})


class GeneratorTest(unittest.TestCase):
    SOURCE = 'def generate(rng):\n    a = rng.randint(1, 100)\n    return {"statement": f"${a}$", "answer": a}\n'

    def test_deterministic(self):
        self.assertEqual(run_generator(self.SOURCE, 7), run_generator(self.SOURCE, 7))
        self.assertIsInstance(run_generator(self.SOURCE, 7)['answer'], str)




class ApiTest(unittest.TestCase):
    def test_handle(self):
        import json
        from cutemath.api import handle
        self.assertEqual(json.loads(handle(json.dumps({'op': 'check', 'type': 'number', 'user': '(-3)/(2)', 'correct': '-3/2'}))), {'ok': True})
        self.assertEqual(json.loads(handle('{"op": "ping"}')), 'pong')


class ParseTest(unittest.TestCase):
    def test_capital_letters_are_variables(self):
        self.assertEqual(check('expression', 'N + S', 'S + N'), {'ok': True})

    def test_real_root(self):
        self.assertEqual(check('number', 'real_root(-8, 3)', '-2'), {'ok': True})


if __name__ == '__main__':
    unittest.main()
