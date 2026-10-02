import sympy

x = sympy.Symbol('x')


def generate(rng):
    a = rng.choice([-3, -2, -1, 1, 2, 3])
    n = rng.randint(5, 40)
    f = x ** n + sum(rng.randint(-5, 5) * x ** k for k in range(4))
    g = x - a
    return {
        'statement': f'Найдите остаток от деления $f(x) = {sympy.latex(f)}$ на ${sympy.latex(g)}$.',
        'answer': sympy.rem(f, g, x),
    }
