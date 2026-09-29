def set_tex(s):
    return '\\{' + ', '.join(str(x) for x in sorted(s)) + '\\}'


def generate(rng):
    xs = list(range(1, 9))
    f = {x: rng.randint(1, 5) for x in xs}
    table = (
        '$$\\begin{array}{c|' + 'c' * len(xs) + '} x & ' + ' & '.join(map(str, xs)) + ' \\\\ \\hline '
        'f(x) & ' + ' & '.join(str(f[x]) for x in xs) + ' \\end{array}$$'
    )
    kind = rng.randrange(3)
    if kind == 0:
        b = set(rng.sample(range(1, 6), rng.randint(1, 3)))
        question, answer = f'$|f^{{-1}}({set_tex(b)})|$', sum(1 for x in xs if f[x] in b)
    elif kind == 1:
        a = set(rng.sample(xs, rng.randint(3, 5)))
        question, answer = f'$|f({set_tex(a)})|$', len({f[x] for x in a})
    else:
        a = set(rng.sample(xs, rng.randint(1, 3)))
        image = {f[x] for x in a}
        question, answer = f'$|f^{{-1}}(f({set_tex(a)}))|$', sum(1 for x in xs if f[x] in image)
    return {
        'statement': f'Функция $f \\colon \\{{1, \\ldots, 8\\}} \\to \\{{1, \\ldots, 5\\}}$ задана таблицей\n{table}\nНайдите {question}.',
        'answer': answer,
    }
