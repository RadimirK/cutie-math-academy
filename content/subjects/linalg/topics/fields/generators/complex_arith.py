import sympy

I = sympy.I


def _tex(z):
    return sympy.latex(z).replace('i', 'i')


def generate(rng):
    a, b, c, d = (rng.choice([-4, -3, -2, -1, 1, 2, 3, 4]) for _ in range(4))
    z, w = a + b * I, c + d * I
    if rng.random() < 0.5:
        expr, ans = f'({_tex(z)})({_tex(w)})', sympy.expand(z * w)
    else:
        p = sympy.expand(z * w)
        expr, ans = f'\\frac{{{_tex(p)}}}{{{_tex(w)}}}', z
    return {
        'statement': f'Вычислите ${expr}$. Ответ запишите в виде $a + bi$.',
        'answer': ans,
    }
