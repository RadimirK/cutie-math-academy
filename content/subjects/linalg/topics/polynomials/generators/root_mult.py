import sympy

x = sympy.Symbol('x')


def generate(rng):
    a, b = rng.sample([-3, -2, -1, 1, 2, 3], 2)
    k, l = rng.randint(1, 4), rng.randint(1, 3)
    f = sympy.expand((x - a) ** k * (x - b) ** l)
    return {
        'statement': f'Какова кратность корня ${a}$ у многочлена $f(x) = {sympy.latex(f)}$?',
        'answer': sympy.roots(sympy.Poly(f, x))[a],
    }
