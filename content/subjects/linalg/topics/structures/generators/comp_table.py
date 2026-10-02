def _table(name, f):
    xs = sorted(f)
    return (
        '\\begin{array}{c|ccccc} x & ' + ' & '.join(map(str, xs)) + ' \\\\ \\hline '
        + name + '(x) & ' + ' & '.join(str(f[x]) for x in xs) + ' \\end{array}'
    )


def generate(rng):
    xs = range(1, 6)
    f = {x: rng.randint(1, 5) for x in xs}
    g = {x: rng.randint(1, 5) for x in xs}
    a = rng.randint(1, 5)
    if rng.random() < 0.5:
        expr, ans = f'(g \\circ f)({a})', g[f[a]]
    else:
        expr, ans = f'(f \\circ g)({a})', f[g[a]]
    return {
        'statement': (
            'Отображения $f, g\\colon \\{1, \\ldots, 5\\} \\to \\{1, \\ldots, 5\\}$ заданы таблицами\n'
            f'$$' + _table('f', f) + '$$\n$$' + _table('g', g) + f'$$\nНайдите ${expr}$.'
        ),
        'answer': ans,
    }
