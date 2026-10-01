from math import pi, sin

COUNT = 12

# (LaTeX, n-th term). Any two of them differ visibly somewhere on the plot.
SEQUENCES = [
    ('\\frac{1}{n}', lambda n: 1 / n),
    ('-\\frac{1}{n}', lambda n: -1 / n),
    ('1 + \\frac{1}{n}', lambda n: 1 + 1 / n),
    ('1 - \\frac{1}{n}', lambda n: 1 - 1 / n),
    ('\\frac{(-1)^n}{n}', lambda n: (-1) ** n / n),
    ('\\frac{(-1)^{n+1}}{n}', lambda n: (-1) ** (n + 1) / n),
    ('(-1)^n', lambda n: (-1) ** n),
    ('\\frac{1}{2^n}', lambda n: 2 ** -n),
    ('\\frac{1}{n^2}', lambda n: 1 / n ** 2),
    ('1 + \\frac{(-1)^n}{n}', lambda n: 1 + (-1) ** n / n),
    ('\\sin \\frac{\\pi n}{2}', lambda n: sin(pi * n / 2)),
    ('\\frac{n}{n + 1}', lambda n: n / (n + 1)),
    ('\\frac{n}{2^n}', lambda n: n / 2 ** n),
    ('\\left(-\\frac{1}{2}\\right)^n', lambda n: (-0.5) ** n),
    ('\\frac{2n}{n + 1}', lambda n: 2 * n / (n + 1)),
]

assert all(
    max(abs(f(n) - g(n)) for n in range(1, COUNT + 1)) >= 0.2
    for i, (_, f) in enumerate(SEQUENCES)
    for _, g in SEQUENCES[i + 1:]
)


def generate(rng):
    tex, f = rng.choice(SEQUENCES)
    return {
        'statement': f'На графике — первые ${COUNT}$ членов последовательности $x_n$. Какая это последовательность?',
        'answer': f'$x_n = {tex}$',
        'config': {'distractors': [f'$x_n = {t}$' for t, _ in SEQUENCES if t != tex], 'count': 8},
        'figure': {'type': 'sequence', 'values': [round(f(n), 6) for n in range(1, COUNT + 1)]},
    }
