def generate(rng):
    kind = rng.randrange(5)
    if kind == 0:
        k = rng.randint(3, 9)
        n = rng.randint(k + 1, 30)
        return {
            'statement': f'На множестве $\\{{1, 2, \\ldots, {n}\\}}$ задано отношение $a \\equiv_{{{k}}} b$ (одинаковый остаток от деления на ${k}$). Сколько у него классов эквивалентности?',
            'answer': k,
        }
    if kind == 1:
        xs = range(1, 9)
        f = {x: rng.randint(1, 6) for x in xs}
        table = (
            '$$\\begin{array}{c|cccccccc} x & ' + ' & '.join(map(str, xs)) + ' \\\\ \\hline '
            'f(x) & ' + ' & '.join(str(f[x]) for x in xs) + ' \\end{array}$$'
        )
        return {
            'statement': f'Функция $f$ задана таблицей\n{table}\nНа $\\{{1, \\ldots, 8\\}}$ введено отношение $x \\sim y \\iff f(x) = f(y)$. Сколько у него классов эквивалентности?',
            'answer': len(set(f.values())),
        }
    if kind == 2:
        n = rng.randint(3, 10)
        return {
            'statement': f'На множестве слов длины ${n}$ из букв $a$ и $b$ введено отношение: $u \\sim v$, если в $u$ и $v$ одинаковое число букв $a$. Сколько у него классов эквивалентности?',
            'answer': n + 1,
        }
    if kind == 3:
        n = rng.randint(3, 10)
        return {
            'statement': f'На $2^{{\\{{1, \\ldots, {n}\\}}}}$ введено отношение $S \\sim T \\iff |S| = |T|$. Сколько у него классов эквивалентности?',
            'answer': n + 1,
        }
    n = rng.randint(3, 10)
    return {
        'statement': f'На множестве пар $\\{{1, \\ldots, {n}\\}}^2$ введено отношение $\\langle a, b \\rangle \\sim \\langle c, d \\rangle \\iff a + b = c + d$. Сколько у него классов эквивалентности?',
        'answer': 2 * n - 1,
    }
