import sympy

x = sympy.Symbol('x')


def generate(rng):
    xs = sorted(rng.sample([-2, -1, 0, 1, 2, 3], 3))
    ys = [rng.randint(-6, 6) for _ in xs]
    f = sympy.expand(sympy.interpolate(list(zip(xs, ys)), x))
    pts = ', '.join(f'({u}, {v})' for u, v in zip(xs, ys))
    return {
        'statement': f'Найдите многочлен степени не выше $2$, график которого проходит через точки ${pts}$.',
        'answer': f,
        'config': {'variables': ['x']},
    }
