from math import prod


def _table(f, cols):
    xs = sorted(f)
    return (
        '$$\\begin{array}{c|' + 'c' * len(xs) + '} x & ' + ' & '.join(map(str, xs)) + ' \\\\ \\hline '
        'f(x) & ' + ' & '.join(cols[f[x]] for x in xs) + ' \\end{array}$$'
    )


def generate(rng):
    letters = 'abcdefg'
    if rng.random() < 0.5:
        m = rng.randint(2, 4)
        n = rng.randint(m + 1, m + 3)
        image = rng.sample(range(n), m)
        f = {x: image[x - 1] for x in range(1, m + 1)}
        B = ', '.join(letters[:n])
        return {
            'statement': (
                f'Отображение $f\\colon \\{{1, \\ldots, {m}\\}} \\to \\{{{B}\\}}$ задано таблицей\n'
                + _table(f, letters)
                + '\nСколько у $f$ различных обратных слева отображений $g$ (таких, что $g \\circ f = \\mathrm{id}$)?'
            ),
            'answer': m ** (n - m),
        }
    n = rng.randint(2, 4)
    m = rng.randint(n + 1, n + 3)
    values = list(range(n)) + [rng.randrange(n) for _ in range(m - n)]
    rng.shuffle(values)
    f = {x: values[x - 1] for x in range(1, m + 1)}
    B = ', '.join(letters[:n])
    return {
        'statement': (
            f'Отображение $f\\colon \\{{1, \\ldots, {m}\\}} \\to \\{{{B}\\}}$ задано таблицей\n'
            + _table(f, letters)
            + '\nСколько у $f$ различных обратных справа отображений $g$ (таких, что $f \\circ g = \\mathrm{id}$)?'
        ),
        'answer': prod(values.count(b) for b in range(n)),
    }
